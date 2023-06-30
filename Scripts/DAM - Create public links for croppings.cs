using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

class CroppingDefinition
{

    public CroppingDefinition(string title, bool isOriginal, int width, int height, int ratioX, int ratioY, string ratioName)
    {
        this.Original = isOriginal;
        this.Name = setCroppingName(title, width, height, ratioX, ratioY, ratioName);
        this.Width = width;
        this.Height = height;
        this.RatioX = ratioX;
        this.RatioY = ratioY;
    }

    public bool Original { get; set; }
    public string Name { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public int RatioX { get; set; }
    public int RatioY { get; set; }

    // determines the name convention of the cropping, enforcing a unique URL friendly name
    private string setCroppingName(string title, int width, int height, int ratioX, int ratioY, string ratioName)
    {
        title = replaceDiacritics(title);
        title = sanatizeFilename(title);

        if (this.Original)
        {
            return $"{title}-original";
        }
        else if (width > 0)
        {
            return $"{title}-{width}x{height}";
        }
        else if (!string.IsNullOrEmpty(ratioName))
        {
            return $"{title}-{ratioName}";
        }
        else
        {
            return $"{title}-{ratioX}x{ratioY}";
        }
    }

    // replaces diacritics with their plain character variant
    private string replaceDiacritics(string input)
    {
        // first replace characters with their ASCII equivalent that would not be translated correctly using ASCII encoding
        var sb = new StringBuilder(input);
        sb.Replace("ß", "ss");
        sb.Replace("Æ", "AE");
        sb.Replace("æ", "ae");
        sb.Replace("&", "and");

        // for the next step, it would be more common to use Normalization, but this would require
        // using UnicodeCategory retrieval to distinguish the NonSpacingMark characters,
        // which isn't possible as System.Global.UnicodeCategory is a prohibited type or namespace in action scripts
        // this alternative trick produces the same result, by first encoding it to Cyrillic and then to ASCII
        // actually, this method is even simpler (less code) and more effective, as it ensures using ASCII characters exclusively
        // which is a requirement for generating valid URLs (Normalization keeps certain diacritics that are seen as letters like đ, Đ
        // and hence do not decompose into an ASCII character with a non-spacing mark, while this conversion translates them to d, D)
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
        var bytes = Encoding.GetEncoding("Cyrillic").GetBytes(sb.ToString());
        var ascii = Encoding.ASCII.GetString(bytes);

        // because some exotic characters do not have an ASCII base character (like £ or ₧), the previous encoding result
        // outputs question marks to replace those characters - to avoid generating invalid or strange URLs, we need to strip them out afterwards
        ascii = ascii.Replace("?", string.Empty);

        return ascii;
    }

    // prepare filename for usage in URL
    private string sanatizeFilename(string input)
    {
        // replace spaces with dashes to generate well-formed and human readible filenames
        input = Regex.Replace(input, @"\s+", " ");
        input = input.Replace(" ", "-");
        
        // remove all unallowed characters like interpunction, brackets etc.
        var result = Regex.Replace(input, @"[^A-Za-z0-9\-]", string.Empty);

        // return the lower case result of the sanatized filename
        return result.ToLower();
    }
}

// retrieve asset data
long? assetId;
if (Context.ExecutionSource == ExecutionSource.WebApi)
{
    var data = Context.Data as JObject;
    assetId = data?["assetId"]?.Value<long>();
}
else
{
    assetId = Context.TargetId;
}

var asset = await MClient.Entities.GetAsync(assetId.Value);
var title = asset.GetPropertyValue("Title").ToString();

var renditionResource = "downloadOriginal";

var mainFile = JObject.Parse(asset.GetPropertyValue("MainFile").ToString());
var originalWidth = mainFile["properties"]["width"].ToObject<int>();
var originalHeight = mainFile["properties"]["height"].ToObject<int>();
var assetMediaType = mainFile["properties"]["group"].ToObject<string>();
var scaleFactor = 1d;

if (assetMediaType.Equals("Vectors"))
{    
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
}
else if (!assetMediaType.Equals("Images"))
{
    // other media types like Videos and Documents should not be cropped
    return;
}

var focalPointX = asset.GetPropertyValue<int?>("FocalPointX");
var focalPointY = asset.GetPropertyValue<int?>("FocalPointY");

// configure auto-generated croppings
var croppings = new Dictionary<string, CroppingDefinition>();
AddCroppingDefinition(false, 0, 0, 0, 0);
AddCroppingDefinition(true, 1280, 960, 0, 0);
AddCroppingDefinition(true, 1280, 430, 0, 0);
AddCroppingDefinition(true, 320, 100, 0, 0);
AddCroppingDefinition(true, 400, 600, 0, 0);
AddCroppingDefinition(true, 0, 0, 3, 1);
AddCroppingDefinition(true, 0, 0, 16, 9);
AddCroppingDefinition(true, 0, 0, 4, 5);
AddCroppingDefinition(true, 0, 0, 16, 5, "hero");
AddCroppingDefinition(true, 0, 0, 1, 5, "skyscraper");
AddCroppingDefinition(true, 0, 0, 1, 1, "square");

void AddCroppingDefinition(bool cropOriginal, int width, int height, int ratioX, int ratioY, string ratioName = null)
{
    // the default public link name and thus URL is using the asset Identifier as a base, which is unique and stable 
    var croppingDefinition = new CroppingDefinition(asset.Identifier, !cropOriginal, width, height, ratioX, ratioY, ratioName);

    // you could also opt for the asset ID, less verbose than the Identifier, though it would expose all of your assets (retrievable by iterating through the IDs)
    //var croppingDefinition = new CroppingDefinition(assetId.ToString(), !cropOriginal, width, height, ratioX, ratioY, ratioName);
    
    // you could also opt for the asset title, generating a more human friendly URL, but it can change over time and is less reliable for persistant public link usage
    //var croppingDefinition = new CroppingDefinition(title, !cropOriginal, width, height, ratioX, ratioY, ratioName);
    
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
    foreach (var entityId in result.Items)
    {
        // retrieve existing public link entity to update its cropping based on the new focal point
        var publicLink = await MClient.Entities.GetAsync(entityId);
        var relativeUrl = publicLink.GetPropertyValue<string>("RelativeUrl");

        if (croppings.ContainsKey(relativeUrl))
        {
            // update public link crop configuration for new focal point data
            await UpdatePublicLink(publicLink, croppings[relativeUrl]);

            // remove cropping definition from the list, since it already has been processed
            croppings.Remove(relativeUrl);
        }
    }
}

// iterate over all cropping definitions that didn't have a public link already and create one
foreach (var cropping in croppings)
{
    await CreatePublicLink(renditionResource, assetId.Value, cropping.Value);
}

// create new public link for this asset
async Task CreatePublicLink(string rendition, long assetId, CroppingDefinition crop)
{
    if (crop.Width > 0)
    {
        MClient.Logger.Info($"Creating public link for asset with ID {assetId} and dimensions {crop.Width} x {crop.Height}.");
    }
    else if (crop.RatioX > 0)
    {
        MClient.Logger.Info($"Creating public link for asset with ID {assetId} and ratio {crop.RatioX} x {crop.RatioY}.");
    }
    else
    {
        MClient.Logger.Info($"Creating public link for asset with ID {assetId}.");
    }

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

    CropAndSavePublicLink(publicLink, crop);
    return;
}

// update existing public link for this asset
async Task UpdatePublicLink(IEntity publicLink, CroppingDefinition crop)
{
    if (crop.Width > 0)
    {
        MClient.Logger.Info($"Updating crop configuration for asset with ID {assetId} and dimensions {crop.Width} x {crop.Height}.");
    }
    else if (crop.RatioX > 0)
    {
        MClient.Logger.Info($"Updating crop configuration for asset with ID {assetId} and ratio {crop.RatioX} x {crop.RatioY}.");
    }
    else
    {
        MClient.Logger.Info($"Updating crop configuration for asset with ID {assetId}.");
    }    

    CropAndSavePublicLink(publicLink, crop);
    return;
}

async Task CropAndSavePublicLink(IEntity publicLink, CroppingDefinition crop)
{
    // no cropping required, use original size for public link and omit creating the ConversionConfiguration
    if (!crop.Original)
    {
        // assume the cropping width and height are configured, use this as the default target to crop to
        int width = crop.Width;
        int height = crop.Height;

        // if a cropping ratio is set, use that aspect ratio to calculate the maximum available resolution for this ratio
        if (crop.RatioX > 0)
        {
            if (originalWidth / crop.RatioX > originalHeight / crop.RatioY)
            {
                width = originalHeight * crop.RatioX / crop.RatioY;
                height = originalHeight;
            }
            else
            {
                width = originalWidth;
                height = originalWidth * crop.RatioY / crop.RatioX;
            }
        }

        // create the cropping conversion configuration
        var croppingConfiguration = BuildConversionConfiguration(width, height);
        publicLink.SetPropertyValue("ConversionConfiguration", croppingConfiguration);
    }
    
    // save the public link
    await MClient.Entities.SaveAsync(publicLink);
    return;
}

// build conversion config json object for desired cropping configuration
JObject BuildConversionConfiguration(int targetWidth, int targetHeight)
{
    JObject conversionConfig = new JObject();
    conversionConfig["cropping_configuration"] = new JObject();

    if (focalPointX == null || !focalPointX.HasValue ||
        focalPointY == null || !focalPointY.HasValue ||
        (focalPointX.Value == 0 && focalPointY.Value == 0)) {

        // use smart cropping algorithm if no valid focal point data is set or available
        conversionConfig["cropping_configuration"]["cropping_type"] = "Entropy";

        conversionConfig["cropping_configuration"]["width"] = targetWidth;
        conversionConfig["cropping_configuration"]["height"] = targetHeight;
    }
    else
    {
        int offsetX = 0;
        int offsetY = 0;

        var widthRatio = (double)originalWidth / targetWidth;
        var heightRatio = (double)originalHeight / targetHeight;

        var relativeWidth = originalWidth;
        var relativeHeight = originalHeight;

        if (widthRatio > heightRatio)
        {
            relativeWidth = (int)Math.Round((double)originalHeight / targetHeight * targetWidth);
            offsetX = Math.Min(Math.Max((int)Math.Round((focalPointX.Value * scaleFactor) - relativeWidth / 2d), 0), originalWidth - relativeWidth);
        }
        else if (widthRatio < heightRatio)
        {
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