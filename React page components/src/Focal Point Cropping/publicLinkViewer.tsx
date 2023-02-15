import { IContentHubClient } from "@sitecore/sc-contenthub-webclient-sdk/dist/clients/content-hub-client";
import { RelationRole } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/base";
import { IEntity } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/base/entity";
import { EntityLoadConfiguration } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/entity-load-configuration";
import React, { useEffect, useState } from "react";
import ErrorBoundary from "./ErrorBoundary";
import Table from '@mui/material/Table';
import { Box, Button, CircularProgress, TableBody, TableCell, TableContainer, TableRow, Typography } from "@mui/material";
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

            console.log("Loading public links (version 3.0.15)");
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
                                    <div>
                                        <Typography variant="caption">
                                            <Button title="Refresh" aria-label="Refresh" variant="text" startIcon={<RefreshIcon />} onClick={refresh} /> {publicLinkQueryResult?.length} items
                                        </Typography>

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
                                    </div>
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
        var width = conversionConfiguration?.width ?? conversionConfiguration?.cropping_configuration?.width ?? 0;
        var height = conversionConfiguration?.height ?? conversionConfiguration?.cropping_configuration?.height ?? 0;

        if (croppingType === "Entropy") {
            croppingType = "Smart crop";
        } else if (croppingType === "Custom") {
            croppingType = "Custom crop";
        } else if (croppingType === "CentralFocalPoint") {
            croppingType = "Crop to center";
        }

        return (
            <TableRow key={"row_" + index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell size="small">
                    <a href={entityUrl} target="_blank">
                        <img src={entityUrl + "&t=thumbnail"} alt="Image preview" />
                    </a>
                </TableCell>
                <TableCell valign="top">
                    <Typography variant="body1">
                        <strong>{title}</strong>
                    </Typography>
                    <Box>
                        <Typography variant="caption">
                            <strong>{rendition.label}</strong> · {croppingType} · {width} x {height} px
                        </Typography>
                    </Box>
                </TableCell>
            </TableRow>
        )
    }

    function getRenditions(entityId: number) {
        var renditions: { [id: string]: IRendition } = {};

        const contentHubBaseUrl = "https://react-demo.sitecoresandbox.cloud/";

        fetch(contentHubBaseUrl + "api/entities/" + entityId + "/renditions")
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

                        rendition.label = label;
                        rendition.contentType = "Unknown";

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