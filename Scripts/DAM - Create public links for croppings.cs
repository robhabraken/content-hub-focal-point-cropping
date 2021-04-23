using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

struct CroppingDefinition {

    public CroppingDefinition(string title, int width, int height) {

        // current (temporary) naming convention of croppings, not unique per se as the title isn't guaranteed to be unique
        this.Name = $"{title}-{width}x{height}".Replace(" ", "-").ToLower();
        
        this.Width = width;
        this.Height = height;
    }

    public string Name { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
}

// retrieve asset data
var assetId = Context.TargetId;
var asset = await MClient.Entities.GetAsync(assetId.Value);
var title = asset.GetPropertyValue("Title").ToString();

var renditionResource = "downloadOriginal";

var mainFile = JObject.Parse(asset.GetPropertyValue("MainFile").ToString());
var originalWidth = mainFile["properties"]["width"].ToObject<int>();
var originalHeight = mainFile["properties"]["height"].ToObject<int>();
var assetMediaType = mainFile["properties"]["group"].ToObject<string>();
var scaleFactor = 1d;

if (assetMediaType.Equals("Vectors")) {
    
    // switch to another rendition resource for vector images, as the original file cannot be cropped
    // this rendition should be configured in the media processing flow for vector images for this script to work
    renditionResource = "bitmap_for_web";

    var mainFileWidth = originalWidth;
    
    // the bitmap rendition might have different dimension than the original main file (vector of 300 dpi vs bitmap of 72 dpi)
    // hence, when switching renditions, also retrieve the dimensions from that specific rendition
    var renditions = JObject.Parse(asset.GetPropertyValue("Renditions").ToString());
    originalWidth = renditions[renditionResource]["properties"]["width"].ToObject<int>();
    originalHeight = renditions[renditionResource]["properties"]["height"].ToObject<int>();

    // determine scale factor of rendition for focal point scaling
    scaleFactor = (double)originalWidth / mainFileWidth;

} else if (!assetMediaType.Equals("Images")) {

    // other media types like Videos and Documents should not be cropped
    return;
}

var focalPointX = asset.GetPropertyValue<int?>("FocalPointX");
var focalPointY = asset.GetPropertyValue<int?>("FocalPointY");

// configure auto-generated croppings
var croppings = new Dictionary<string, CroppingDefinition>();
AddCroppingDefinition(1280, 960);
AddCroppingDefinition(1280, 430);
AddCroppingDefinition(320, 100);
AddCroppingDefinition(400, 600);

void AddCroppingDefinition(int width, int height) {
    var croppingDefinition = new CroppingDefinition(title, width, height);
    croppings.Add(croppingDefinition.Name, croppingDefinition);
}

// retrieve existing public link entities to check which crops already exist
var query = Query.CreateQuery(entities => from e in entities
                                            where e.DefinitionName == "M.PublicLink"
                                            && e.Parent("AssetToPublicLink") == assetId.Value
                                            && e.Property("Resource") == renditionResource
                                            && e.Property("IsDisabled") == false
                                            select e);


var result = await MClient.Querying.QueryIdsAsync(query);
if (result.TotalNumberOfResults > 0)
{ 
    foreach(var entityId in result.Items) {

        // retrieve existing public link entity to update its cropping based on the new focal point
        var publicLink = await MClient.Entities.GetAsync(entityId);
        var relativeUrl = publicLink.GetPropertyValue<string>("RelativeUrl");

        if(croppings.ContainsKey(relativeUrl)) {

            // update public link crop configuration for new focal point data
            await UpdatePublicLink(publicLink, croppings[relativeUrl]);

            // remove cropping definition from the list, since it already has been processed
            croppings.Remove(relativeUrl);
        }
    }
}

// iterate over all cropping definitions that didn't have a public link already and create one
foreach(var cropping in croppings) {
    await CreatePublicLink(renditionResource, assetId.Value, cropping.Value);
}

// create new public link for this asset
async Task CreatePublicLink(string rendition, long assetId, CroppingDefinition crop)
{
    MClient.Logger.Info($"Creating public link for asset with ID {assetId} and dimensions {crop.Width} x {crop.Height}.");

    var publicLink = await MClient.EntityFactory.CreateAsync("M.PublicLink");

    if (publicLink.CanDoLazyLoading())
    {
        await publicLink.LoadMembersAsync(new PropertyLoadOption("Resource"), new RelationLoadOption("AssetToPublicLink"));
    }

    publicLink.SetPropertyValue("Resource", rendition);
    publicLink.SetPropertyValue("RelativeUrl", crop.Name);

    var relation = publicLink.GetRelation<IChildToManyParentsRelation>("AssetToPublicLink");
    if (relation == null)
    {
        MClient.Logger.Error("Unable to create public link: no AssetToPublicLink relation found.");
        return;
    }

    relation.Parents.Add(assetId);
    
    var croppingConfiguration = BuildConversionConfiguration(crop.Width, crop.Height);
    publicLink.SetPropertyValue("ConversionConfiguration", croppingConfiguration);

    await MClient.Entities.SaveAsync(publicLink);
    return;
}

// update existing public link for this asset
async Task UpdatePublicLink(IEntity publicLink, CroppingDefinition crop)
{
    MClient.Logger.Info($"Updating crop configuration for asset with ID {assetId} and dimensions {crop.Width} x {crop.Height}.");

    var croppingConfiguration = BuildConversionConfiguration(crop.Width, crop.Height);
    publicLink.SetPropertyValue("ConversionConfiguration", croppingConfiguration);

    await MClient.Entities.SaveAsync(publicLink);
    return;
}

// build conversion config json object for desired cropping configuration
JObject BuildConversionConfiguration(int targetWidth, int targetHeight) {

    JObject conversionConfig = new JObject();
    conversionConfig["cropping_configuration"] = new JObject();

    if(focalPointX == null || !focalPointX.HasValue ||
        focalPointY == null || !focalPointY.HasValue ||
        (focalPointX.Value == 0 && focalPointY.Value == 0)) {

        // use smart cropping algorithm if no valid focal point data is set or available
        conversionConfig["cropping_configuration"]["cropping_type"] = "Entropy";

        conversionConfig["cropping_configuration"]["width"] = targetWidth;
        conversionConfig["cropping_configuration"]["height"] = targetHeight;

    } else {

        int offsetX = 0;
        int offsetY = 0;

        var widthRatio = (double)originalWidth / targetWidth;
        var heightRatio = (double)originalHeight / targetHeight;

        var relativeWidth = originalWidth;
        var relativeHeight = originalHeight;

        if(widthRatio > heightRatio) {

            relativeWidth = (int)Math.Round((double)originalHeight / targetHeight * targetWidth);
            offsetX = Math.Min(Math.Max((int)Math.Round((focalPointX.Value * scaleFactor) - relativeWidth / 2d), 0), originalWidth - relativeWidth);

        } else if(widthRatio < heightRatio) {

            relativeHeight = (int)Math.Round((double)originalWidth / targetWidth * targetHeight);
            offsetY = Math.Min(Math.Max((int)Math.Round((focalPointY.Value * scaleFactor) - relativeHeight / 2d), 0), originalHeight - relativeHeight);
        }

        conversionConfig["cropping_configuration"]["cropping_type"] = "Custom";
        conversionConfig["cropping_configuration"]["top_left"] = new JObject();
        conversionConfig["cropping_configuration"]["top_left"]["x"] = offsetX;
        conversionConfig["cropping_configuration"]["top_left"]["y"] = offsetY;

        // mind that the cropping configuration dimensions shouldn't per se contain the target dimensions, but the crop area dimensions before resizing
        // this equals the target dimensions ratio scaled up to the original dimensions, which is calculated above
        conversionConfig["cropping_configuration"]["width"] = relativeWidth;
        conversionConfig["cropping_configuration"]["height"] = relativeHeight;
    }

    conversionConfig["original_width"] = originalWidth;
    conversionConfig["original_height"] = originalHeight;

    conversionConfig["width"] = targetWidth;
    conversionConfig["height"] = targetHeight;

    conversionConfig["ratio"] = new JObject();
    conversionConfig["ratio"]["name"] = "free";

    return conversionConfig;
}