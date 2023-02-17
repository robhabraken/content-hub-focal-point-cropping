import { IContentHubClient } from "@sitecore/sc-contenthub-webclient-sdk/dist/clients/content-hub-client";
import { RelationRole } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/base";
import { IEntity } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/base/entity";
import { EntityLoadConfiguration } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/entity-load-configuration";
import React, { useEffect, useState } from "react";
import ErrorBoundary from "./ErrorBoundary";
import Table from '@mui/material/Table';
import { Box, Button, CircularProgress, TableBody, TableCell, TableContainer, TableRow, ThemeProvider, Typography } from "@mui/material";
import RefreshIcon from '@mui/icons-material/Refresh';
import { ContentHubPageProps, ConversionConfiguration, IContentHubContext, IRendition, Rendition } from "./types";

const OptionsContext = React.createContext<ContentHubPageProps>(new ContentHubPageProps);

export const PublicLinkViewer = ({ context }: { context: IContentHubContext }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [publicLinkQueryResult, setPublicLinkQueryResult] = useState<IEntity[]>();
    const [renditions, setRenditions] = useState<{ [id: string]: IRendition }>();

    useEffect(() => {
        if (!isLoading) {
            setIsLoading(true);

            console.log("Loading public links");
            loadPublicLinks(context.client, context.options.entityId)
                .then(publicLinks => {
                    console.log("Public links loaded")
                    setPublicLinkQueryResult(publicLinks);
                    setIsLoaded(true);
                });
        }
    });

    function refresh() {
        setIsLoading(false);
        setIsLoaded(false);
        setPublicLinkQueryResult(undefined);
    }

    return (
        <ErrorBoundary>
            <OptionsContext.Provider value={context.options}>
                <OptionsContext.Consumer>
                    {
                        (options) => {
                            if (!isLoaded) {
                                return (
                                    <>
                                        <CircularProgress />
                                    </>
                                );
                            }

                            return (
                                <>
                                    <ThemeProvider theme={context.theme}>
                                        <Typography variant="caption">
                                            {publicLinkQueryResult?.length} items <Button aria-label="Refresh" data-tip="Refresh" data-for="toolTipComponent" data-place="top" variant="text" color="inherit" size="small" startIcon={<RefreshIcon />} onClick={refresh} />
                                        </Typography>
                                    </ThemeProvider>

                                    <TableContainer>
                                        <Table>
                                            <TableBody>
                                                {
                                                    publicLinkQueryResult?.map((entity, index) =>
                                                        renderPublicLink(entity, index, renditions)
                                                    )
                                                }
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </>
                            );
                        }
                    }
                </OptionsContext.Consumer>
            </OptionsContext.Provider>
        </ErrorBoundary>
    )

    async function loadPublicLinks(client: IContentHubClient, entityId: number) {
        var entity = await client.entities.getAsync(entityId, EntityLoadConfiguration.Full);

        if (entity == null) {
            return new Array<IEntity>();
        }

        var publicLinkRelation = entity.getRelation('AssetToPublicLink', RelationRole.Parent);
        var renditions = getRenditions(entityId);
        setRenditions(renditions);

        let ids = publicLinkRelation?.getIds() as number[];
        var publicLinks = await client.entities.getManyAsync(ids, EntityLoadConfiguration.Full);

        publicLinks = publicLinks.sort(comparePublicLink);
        return publicLinks;
    }

    function comparePublicLink(first: IEntity, second: IEntity) {
        var firstTitle = first.getPropertyValue("RelativeUrl") as string;
        var secondTitle = second.getPropertyValue("RelativeUrl") as string;

        return ('' + firstTitle).localeCompare(secondTitle, undefined, { numeric: true, sensitivity: 'base' });
    }


    function renderPublicLink(entity: IEntity, index: number, renditions: { [id: string]: IRendition } | undefined) {
        if (entity == undefined || renditions == undefined) {
            return (<></>);
        }

        const title = entity.getPropertyValue("RelativeUrl") as string;
        const entityUrl = (entity.publicLink as string);

        const rendition = renditions[entity.getPropertyValue("Resource") as string] ?? "Unknown";

        const conversionConfiguration = extractConversionConfiguration(entity);
        var croppingType = conversionConfiguration?.cropping_configuration?.cropping_type ?? "Uncropped";
        var width = conversionConfiguration?.width ?? rendition.width ?? 0;
        var height = conversionConfiguration?.height ?? rendition.height ?? 0;

        if (croppingType === "Entropy") {
            croppingType = "Smart crop";
        } else if (croppingType === "Custom") {
            croppingType = "Custom crop";
        } else if (croppingType === "CentralFocalPoint") {
            croppingType = "Crop to center";
        }

        return (
            <TableRow key={"row_" + index} hover={true}>
                <TableCell size="small" align="center">
                    <a href={entityUrl} target="_blank">
                        <img src={entityUrl + "&t=thumbnail"} alt="Image preview" />
                    </a>
                </TableCell>
                <TableCell valign="top">
                    <ThemeProvider theme={context.theme}>
                        <Typography variant="body1">
                            {title}
                        </Typography>
                    </ThemeProvider>
                    <Box>
                        <ThemeProvider theme={context.theme}>
                            <Typography variant="body2" color={"rgba(0, 0, 0, 0.54)"}>
                                {rendition.label} · {croppingType} · {width} x {height} px
                            </Typography>
                        </ThemeProvider>
                    </Box>
                </TableCell>
            </TableRow>
        )
    }

    function getRenditions(entityId: number) {
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
                            var label = renditionLink["labels"][context.options.culture];
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

    function extractConversionConfiguration(entity: IEntity): ConversionConfiguration {
        return entity.getPropertyValue("ConversionConfiguration") as ConversionConfiguration;
    }
}