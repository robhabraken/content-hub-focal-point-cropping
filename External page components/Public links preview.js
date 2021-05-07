var self = this;
self.plo = null;

var headerSource = document.getElementById("headerTemplate").innerHTML;
var headerTemplate = Handlebars.compile(headerSource);

var listItemSource = document.getElementById("listItemTemplate").innerHTML;
var listItemTemplate = Handlebars.compile(listItemSource);

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
    this._assetId = null;
    this._renditions = {};
}

PublicLinkOverview.prototype = {
    initialize: function (entity) {
        var rawJSON = JSON.stringify(entity);
        var entityObject = JSON.parse(rawJSON);
        this._assetId = entityObject["id"];

        if (this._assetId) {
            this._getRenditions();
            this._renderPublicLinkList();
        }
    },

    dispose: function () {
    },

    _getRenditions: function() {        
        $.getJSON("https://playground.stylelabs.io/api/entities/" + this._assetId + "/renditions", function(data) { 
            var renditionsData = data["renditions"];
            if (renditionsData) {
                for (var index = 0; index < renditionsData.length; index++) {
                   var renditionLink = renditionsData[index]["rendition_link"];
                    if (renditionLink) {
                        var name = renditionLink["name"];

                        // try to retrieve label for current culture
                        var label = renditionLink["labels"][options.culture];
                        if (!label) {
                            // if not available, try to retrieve first label as default
                            label = renditionLink["labels"][0];
                        }
                        if (!label) {
                            // fallback to name if no label available
                            label = name;
                        }
                    }
                    // store label for further reference
                    self.plo._renditions[name] = label;
                }
            }
        }.bind(self));
    },

    _renderPublicLinkList: function () {

        // parse AssetToPublicLink data to retrieve the entity IDs of the public links of this asset
        $.getJSON("https://playground.stylelabs.io/api/entities/" + this._assetId + "/relations/AssetToPublicLink", function(data) { 
            var publicLinkEntities = data["children"];
            if (publicLinkEntities) {

                var context = {itemCount: publicLinkEntities.length};
                var html = headerTemplate(context);
                document.getElementById("publicLinksHeader").innerHTML = html;

                // bind a click event to the refresh button to animate it and re-call this render function
                $('#refreshPublicLinksPreview').click(function(){
                    $('#refreshPublicLinksPreview span').addClass('m-icon-rotate-transform');
                    setTimeout(() => {  $('#refreshPublicLinksPreview span').removeClass('m-icon-rotate-transform') }, 500);
                    document.getElementById("publicLinkList").innerHTML = "";
                    self.plo._renderPublicLinkList();
                });

                // iterate over the public link entities, retrieve their data and render the preview
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
                                var rendition = self.plo._renditions[publicLinkData["properties"]["Resource"]];
                                var width = "";
                                var height = "";

                                var croppingType = null;
                                if (publicLinkData["properties"]["ConversionConfiguration"] && publicLinkData["properties"]["ConversionConfiguration"]["cropping_configuration"]) {
                                    croppingType = publicLinkData["properties"]["ConversionConfiguration"]["cropping_configuration"]["cropping_type"];
                                    width = publicLinkData["properties"]["ConversionConfiguration"]["width"];
                                    height = publicLinkData["properties"]["ConversionConfiguration"]["height"];

                                    // depending on the way of cropping, the width and height are stored in different objects
                                    if (!width || width == null) {
                                        width = publicLinkData["properties"]["ConversionConfiguration"]["cropping_configuration"]["width"];
                                        height = publicLinkData["properties"]["ConversionConfiguration"]["cropping_configuration"]["height"];
                                    }
                                }

                                if (croppingType === "Entropy") {
                                    croppingType = "Smart crop";
                                } else if (croppingType === "Custom") {
                                    croppingType = "Custom crop";
                                } else if (croppingType === "CentralFocalPoint") {
                                    croppingType = "Crop to center";
                                } else {
                                    croppingType = "Uncropped";
                                }

                                var context = {title: title, href: publicLink, preview: thumbnail, rendition: rendition, width: width, height: height, croppingType: croppingType};
                                var html = listItemTemplate(context);
                                document.getElementById("publicLinkList").innerHTML += html;
                            }
                        });

                    }
                }
            }
        }.bind(self));
    }
}