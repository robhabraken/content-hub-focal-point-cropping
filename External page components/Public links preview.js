var self = this;
self.plo = null;

var source   = document.getElementById("listItemTemplate").innerHTML;
var template = Handlebars.compile(source);

var entityLoadedSubscription = options.mediator.subscribe("entityLoaded", function (entity) {
    if(self.plo == null) {
        self.plo = new PublicLinkOverview();
        self.plo.initialize(entity, template);
    }
});

var entityUnloadedSubscription = options.mediator.subscribe("entityUnloaded", function (entity) {
    self.plo.dispose();
});

PublicLinkOverview = function () {
    this._item = null;
}

PublicLinkOverview.prototype = {
    initialize: function (entity, template) {
        this._item = entity;
        this._renderPublicLinkList(template);        
    },

    dispose: function () {
    },

    _renderPublicLinkList: function (template) {
        var rawJSON = JSON.stringify(this._item);
        var entityObject = JSON.parse(rawJSON);
        var assetId = entityObject["id"];

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
                                var thumbnail = publicLink + "&t=thumbnail&r=" + Math.random();

                                var title = publicLinkData["properties"]["RelativeUrl"];
                                var rendition = publicLinkData["properties"]["Resource"];
                                var width = "";
                                var height = "";

                                var croppingType = null;
                                if (publicLinkData["properties"]["ConversionConfiguration"]["cropping_configuration"]) {
                                    croppingType = publicLinkData["properties"]["ConversionConfiguration"]["cropping_configuration"]["cropping_type"];
                                    width = publicLinkData["properties"]["ConversionConfiguration"]["cropping_configuration"]["width"];
                                height = publicLinkData["properties"]["ConversionConfiguration"]["cropping_configuration"]["height"];
                                }

                                if (croppingType === "Entropy") {
                                    croppingType = "Smart crop";
                                } else if (croppingType === "Custom") {
                                    croppingType = "Custom crop";
                                } else if (croppingType === "CentralFocalPoint") {
                                    croppingType = "Crop to center";
                                } else {
                                    croppingType = "Original resolution of " + rendition + " rendition";
                                }

                                var context = {title: title, href: publicLink, preview: thumbnail, width: width, height: height, croppingType: croppingType};
                                var html = template(context);
                                document.getElementById("publicLinkList").innerHTML += html;
                            }
                        });

                    }
                }
            }
        });
    }
}