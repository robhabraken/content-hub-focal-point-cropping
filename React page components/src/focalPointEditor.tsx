import { IContentHubClient } from "@sitecore/sc-contenthub-webclient-sdk/dist/clients/content-hub-client";
import { RelationRole } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/base";
import { IEntity } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/base/entity";
import { EntityLoadConfiguration } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/entity-load-configuration";
import React, { useEffect, useState } from "react";
import ErrorBoundary from "./ErrorBoundary";
import Table from '@mui/material/Table';
import { Box, Button, Container, CircularProgress, Icon, TableBody, TableCell, TableContainer, TableRow, ThemeProvider, Typography } from "@mui/material";
import PhotoIcon from '@mui/icons-material/Photo';
import { ContentHubPageProps, ConversionConfiguration, IContentHubContext, IRendition, Rendition } from "./types";

const OptionsContext = React.createContext<ContentHubPageProps>(new ContentHubPageProps);

export const FocalPointEditor = ({ context }: { context: IContentHubContext }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [publicLinkQueryResult, setPublicLinkQueryResult] = useState<IEntity[]>();
    const [renditions, setRenditions] = useState<{ [id: string]: IRendition }>();

    const [isLocked, setIsLocked] = useState(true);
    const [editButtonText, setEditButtonText] = useState("Edit");

    useEffect(() => {
        if (!isLoading) {
            setIsLoading(true);

            console.log("Loading focal point editor");
            load(context.client, context.options.entityId)
               .then(entity => {
                    console.log("Focal point editor loaded")
                    // setPublicLinkQueryResult(entity);
                    setIsLoaded(true);
                });
        }
    });

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
                                        <Box id="imagePlaceholder" component="div" display="flex" justifyContent="center">
                                            <PhotoIcon style={{
                                                fontSize: 160,
                                                width: 160,
                                                height: 160,
                                                marginTop: 80,
                                                marginBottom: 80,
                                                opacity: 0.25
                                            }} />
                                        </Box>
                                        <Box id="focalPointViewer">
                                            <Box className="image-wrapper">
                                                <Box className="previewFrame">
                                                    <img className="previewImage" src="" />
                                                </Box>
                                            </Box>
                                        </Box>
                                        <Box display="flex" justifyContent="flex-end">
                                            <Button variant="outlined" color="secondary" onClick={edit}>{editButtonText}</Button>
                                            <Box sx={{ m: 1 }} />
                                            <Button variant="outlined" color="primary" disabled={isLocked} onClick={save}>Save</Button>
                                        </Box>
                                    </ThemeProvider>
                                </>
                            );
                        }
                    }
                </OptionsContext.Consumer>
            </OptionsContext.Provider>
        </ErrorBoundary>
    )

    async function load(client: IContentHubClient, entityId: number) {
        var entity = await client.entities.getAsync(entityId, EntityLoadConfiguration.Full);

        if (entity == null) {
            return new Array<IEntity>();
        }

        return entity;
    }

    function edit() {
        if (isLocked) {
            unlock();
        } else {
            previewImageLoaded();
            lock();
        }
    }

    function save() {
        if (!isLocked) {
            setFocalPoint();
            lock();
        }
    }

    function lock() {
        setEditButtonText("Edit");
        setIsLocked(true);
    }

    function unlock() {
        setEditButtonText("Cancel");
        setIsLocked(false);
    }

    function previewImageLoaded() {

    }

    function setFocalPoint() {

    }

    function removeFocalPoint() {

    }

    function clear() {

    }

    function draw() {

    }
}