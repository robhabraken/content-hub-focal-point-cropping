using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;

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
            await UpdatePublicLink(publicLink);

            // remove cropping definition from the list, since it already has been processed
            croppings.Remove(relativeUrl);
        }
    }
}

// iterate over all cropping definitions that didn't have a public link already and create one
foreach(var croppingDef in croppings) {
    await CreatePublicLink("downloadOriginal", assetId.Value, croppingDef.Value.Name);
}

// create new public link for this asset
async Task CreatePublicLink(string rendition, long assetId, string name)
{
    MClient.Logger.Info($"Creating public link for asset with ID {assetId}.");

    var publicLink = await MClient.EntityFactory.CreateAsync("M.PublicLink");

    if (publicLink.CanDoLazyLoading())
    {
        await publicLink.LoadMembersAsync(new PropertyLoadOption("Resource"), new RelationLoadOption("AssetToPublicLink"));
    }

    publicLink.SetPropertyValue("Resource", rendition);
    publicLink.SetPropertyValue("RelativeUrl", name);

    var relation = publicLink.GetRelation<IChildToManyParentsRelation>("AssetToPublicLink");
    if (relation == null)
    {
        MClient.Logger.Error("Unable to create public link: no AssetToPublicLink relation found.");
        return;
    }

    relation.Parents.Add(assetId);

    await MClient.Entities.SaveAsync(publicLink);
    return;
}

// update existing public link for this asset
async Task UpdatePublicLink(IEntity publicLink)
{
    MClient.Logger.Info($"Updating crop configuration for asset with ID {assetId}.");

    await MClient.Entities.SaveAsync(publicLink);
    return;
}