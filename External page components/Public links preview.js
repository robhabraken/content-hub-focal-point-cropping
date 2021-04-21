var self = this;
self.plo = null;

var entityLoadedSubscription = options.mediator.subscribe("entityLoaded", function (entity) {
    if(self.plo == null) {
        self.plo = new PublicLinkOverview();
        self.plo.initialize(entity);
    }
});

var entityUnloadedSubscription = options.mediator.subscribe("entityUnloaded", function (entity) {
    self.plo.dispose();
});

PublicLinkOverview = function () {
    this._item = null;
}

PublicLinkOverview.prototype = {
    initialize: function (entity) {
        this._item = entity;
        this._test = 5;

        this._getPublicLinkList();        
    },

    dispose: function () {

    },

    _getPublicLinkList: function () {
        var rawJSON = JSON.stringify(this._item);
        var entityObject = JSON.parse(rawJSON);
        var assetId = entityObject["id"];

        document.getElementById("publicLinksPreviewGrid").innerHTML = "";

        // parse AssetToPublicLink data to retrieve the entity IDs of the public links of this asset
        $.getJSON("https://playground.stylelabs.io/api/entities/" + assetId + "/relations/AssetToPublicLink", function(data) { 
            var publicLinkEntities = data["children"];
            if (publicLinkEntities) {
                for (var index = 0; index < publicLinkEntities.length; index++) {
                    var publicLinkAssetHref = publicLinkEntities[index]["href"];
                    if(publicLinkAssetHref && publicLinkAssetHref !== "") {

                        // retrieve the entity data of each public link and get the public link url to add a thumbnail to the overview
                        $.getJSON(publicLinkAssetHref, function(publicLinkData) { 
                            var publicLink = publicLinkData["public_link"];
                            if (publicLink && publicLink !== "") {

                                // the thumbnail is displayed using a transformation to avoid loading large images
                                // to ensure the public link thumbnail isn't cached, we add a random value to the image source
                                var html = "<div style='height:160px;'><img src='" + publicLink + "&t=thumbnail&r=" + Math.random() + "' width='50%' /><div class='micro-copy no-margin-bottom'>000 x 000 px</div></div>";
                                document.getElementById("publicLinksPreviewGrid").innerHTML += html;
                            }
                        });

                    }
                }
            }
        });
    }
}