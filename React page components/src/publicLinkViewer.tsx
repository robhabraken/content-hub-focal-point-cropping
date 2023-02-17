import { IContentHubClient } from "@sitecore/sc-contenthub-webclient-sdk/dist/clients/content-hub-client";
import { RelationRole } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/base";
import { IEntity } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/base/entity";
import { EntityLoadConfiguration } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/entity-load-configuration";
import React, { useEffect, useState } from "react";
import ErrorBoundary from "./errorBoundary";
import Table from '@mui/material/Table';
import { Box, Button, CircularProgress, TableBody, TableCell, TableContainer, TableRow, ThemeProvider, Typography } from "@mui/material";
import RefreshIcon from '@mui/icons-material/Refresh';
import { getRenditions } from "./functions";
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
        var renditions = getRenditions(entityId, context.options.culture);
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

    function extractConversionConfiguration(entity: IEntity): ConversionConfiguration {
        return entity.getPropertyValue("ConversionConfiguration") as ConversionConfiguration;
    }
}