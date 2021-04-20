var self = this;
self.pl = null;

options.mediator.subscribe("entityLoaded", function(entity) {
    var rawJSON = JSON.stringify(entity);
    var entityObject = JSON.parse(rawJSON);
    var assetId = entityObject["id"];

    document.getElementById("publicLinksPreviewGrid").innerHTML = "";

    // parse AssetToPublicLink data to retrieve the entity IDs of the public links of this asset
    $.getJSON("https://playground.stylelabs.io/api/entities/" + assetId + "/relations/AssetToPublicLink", function(data) { 
        var publicLinkEntities = data["children"];
        if(publicLinkEntities) {
            for (var index = 0; index < publicLinkEntities.length; index++) {
                var publicLinkAssetHref = publicLinkEntities[index]["href"];
                if(publicLinkAssetHref && publicLinkAssetHref !== "") {
                    self.pl = new PublicLinkDefinition();
                    self.pl.initialize(publicLinkAssetHref);
                }
            }
        }
    });

});

PublicLinkDefinition = function () {
    // this._focalPoint = {};
}

PublicLinkDefinition.prototype = {
    initialize: function (href) {

        $.getJSON(href, function(data) { 

            var publicLink = data["public_link"];
            if(publicLink && publicLink !== "") {
                document.getElementById("publicLinksPreviewGrid").innerHTML += "<img src='" + publicLink + "&t=thumbnail&q=" + Math.random() + "' />";
            }
        });

    },

    dispose: function () {

    }
}