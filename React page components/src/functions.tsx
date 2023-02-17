import { ContentHubPageProps, ConversionConfiguration, IContentHubContext, IRendition, Rendition } from "./types";

export const getRenditions = (entityId: number, culture: string) => {
    var renditions: { [id: string]: IRendition } = {};

    fetch("https://" + window.location.hostname + "/api/entities/"+ entityId + "/renditions")
        .then(response => {
            return response.json()
        })
        .then(data => {
            var renditionsData = data["renditions"];
            if (renditionsData) {
                for (var index = 0; index < renditionsData.length; index++) {

                    var rendition = new Rendition();

                    var renditionLink = renditionsData[index]["rendition_link"];
                    var name;
                    if (renditionLink) {
                        name = renditionLink["name"];

                        // try to retrieve label for current culture
                        var label = renditionLink["labels"][culture];
                        if (!label) {
                            // if not available, try to retrieve first label as default
                            label = renditionLink["labels"][0];
                        }
                        if (!label) {
                            // fallback to name if no label available
                            label = name;
                        }
                    }
                    
                    // retrieve rendition dimensions for displaying uncropped public link dimensions
                    var fileLocation = renditionsData[index]["file_location"];
                    var width, height;
                    if (fileLocation) {
                        var files = fileLocation["files"];
                        if (files && files.length > 0) {
                            var file = files[0];
                            if (file) {
                                var metadata = file["metadata"];
                                if (metadata) {
                                    width = metadata["width"] ?? 0;
                                    height = metadata["height"] ?? 0;
                                }
                            }
                        }
                    }

                    rendition.label = label;
                    rendition.contentType = "Unknown";
                    rendition.width = width;
                    rendition.height = height;

                    // try to retrieve content type and store for further reference
                    var fileLocation = renditionsData[index]["file_location"];
                    if (fileLocation["files"] && fileLocation["files"][0]
                        && fileLocation["files"][0]["metadata"]
                        && fileLocation["files"][0]["metadata"]["content_type"]) {
                        rendition.contentType = fileLocation["files"][0]["metadata"]["content_type"];
                    }

                    renditions[name] = rendition;
                }
            }
        });

    return renditions;
}