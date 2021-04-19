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

var mainFile = JObject.Parse(asset.GetPropertyValue("MainFile").ToString());
var originalWidth = mainFile["properties"]["width"].ToObject<int>();
var originalHeight = mainFile["properties"]["height"].ToObject<int>();

// configure auto-generated croppings
var croppings = new Dictionary<string, CroppingDefinition>();
AddCroppingDefinition(1280, 960);
AddCroppingDefinition(1280, 430);
AddCroppingDefinition(320, 100);

void AddCroppingDefinition(int width, int height) {
    var croppingDefinition = new CroppingDefinition(title, width, height);
    croppings.Add(croppingDefinition.Name, croppingDefinition);
}

// retrieve existing public link entities to check which crops already exist
var query = Query.CreateQuery(entities => from e in entities
                                            where e.DefinitionName == "M.PublicLink"
                                            && e.Parent("AssetToPublicLink") == assetId.Value
                                            && e.Property("Resource") == "downloadOriginal"
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
    await CreatePublicLink("downloadOriginal", assetId.Value, cropping.Value);
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
    
    var croppingConfiguration = BuildConversionConfiguration(crop.Width, crop.Height, null, null);
    publicLink.SetPropertyValue("ConversionConfiguration", croppingConfiguration);

    await MClient.Entities.SaveAsync(publicLink);
    return;
}

// update existing public link for this asset
async Task UpdatePublicLink(IEntity publicLink, CroppingDefinition crop)
{
    MClient.Logger.Info($"Updating crop configuration for asset with ID {assetId} and dimensions {crop.Width} x {crop.Height}.");

    var croppingConfiguration = BuildConversionConfiguration(crop.Width, crop.Height, null, null);
    publicLink.SetPropertyValue("ConversionConfiguration", croppingConfiguration);

    await MClient.Entities.SaveAsync(publicLink);
    return;
}

JObject BuildConversionConfiguration(int targetWidth, int targetHeight, int? focalPointX, int? focalPointY) {

    JObject conversionConfig = new JObject();
    conversionConfig["cropping_configuration"] = new JObject();

    if(focalPointX == null || focalPointY == null) {

        // use smart cropping algorithm if no focal point data is set or available
        conversionConfig["cropping_configuration"]["cropping_type"] = "Entropy";

    } else {

        conversionConfig["cropping_configuration"]["cropping_type"] = "Custom";
        conversionConfig["cropping_configuration"]["top_left"] = new JObject();
        conversionConfig["cropping_configuration"]["top_left"]["x"] = 0; // determine based on focal point, yet to retrieve / calculate
        conversionConfig["cropping_configuration"]["top_left"]["y"] = 0; // determine based on focal point, yet to retrieve / calculate

    }

    conversionConfig["cropping_configuration"]["width"] = targetWidth;
    conversionConfig["cropping_configuration"]["height"] = targetHeight;

    conversionConfig["original_width"] = originalWidth;
    conversionConfig["original_height"] = originalHeight;

    conversionConfig["ratio"] = new JObject();
    conversionConfig["ratio"]["name"] = "free";

    return conversionConfig;
}