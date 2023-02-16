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

export const FocalPointEditor = ({ context }: { context: IContentHubContext }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [publicLinkQueryResult, setPublicLinkQueryResult] = useState<IEntity[]>();
    const [renditions, setRenditions] = useState<{ [id: string]: IRendition }>();

    useEffect(() => {
        if (!isLoading) {
            setIsLoading(true);

            console.log("Loading focal point editor");
            //loadPublicLinks(context.client, context.options.entityId)
            //   .then(publicLinks => {
            //        console.log("Loading focal point editor")
            //      setPublicLinkQueryResult(publicLinks);
            //        setIsLoaded(true);
            //    });
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
                                    hello world
                                </>
                            );
                        }
                    }
                </OptionsContext.Consumer>
            </OptionsContext.Provider>
        </ErrorBoundary>
    )
}