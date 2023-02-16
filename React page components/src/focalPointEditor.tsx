import { IContentHubClient } from "@sitecore/sc-contenthub-webclient-sdk/dist/clients/content-hub-client";
import { CultureLoadOption } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/culture-load-option";
import { RelationRole } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/base";
import { Entity, IEntity } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/base/entity";
import { EntityLoadConfiguration } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/entity-load-configuration";
import React, { useEffect, useState } from "react";
import ErrorBoundary from "./ErrorBoundary";
import { Box, Button, Container, CircularProgress, Icon, TableBody, TableCell, TableContainer, TableRow, ThemeProvider, Typography } from "@mui/material";
import PhotoIcon from '@mui/icons-material/Photo';
import { ContentHubPageProps, ConversionConfiguration, IContentHubContext, IMainFile, IRendition, Rendition } from "./types";

const OptionsContext = React.createContext<ContentHubPageProps>(new ContentHubPageProps);

export const FocalPointEditor = ({ context }: { context: IContentHubContext }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const [showPlaceHolder, setShowPlaceHolder] = useState(false);
    const [showFocalPointViewer, setShowFocalPointViewer] = useState(true);
    
    const [isLocked, setIsLocked] = useState(true);
    const [editButtonText, setEditButtonText] = useState("Edit");
    
    const [item, setItem] = useState<IEntity>();

    useEffect(() => {
        if (!isLoading) {
            setIsLoading(true);

            console.log("Loading focal point editor");
            loadAsset(context.client, context.options.entityId)
               .then(entity => {
                    console.log("Focal point editor loaded")
                    setItem(entity);
                    initialize();
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
                                        { showPlaceHolder && <Box id="imagePlaceholder" display="flex" justifyContent="center">
                                            <PhotoIcon style={{
                                                fontSize: 160,
                                                width: 160,
                                                height: 160,
                                                marginTop: 80,
                                                marginBottom: 80,
                                                opacity: 0.25
                                            }} />
                                        </Box>}
                                        { showFocalPointViewer && <Box id="focalPointViewer" style={showFocalPointViewer ? { display: 'block' } : { display: 'hidden'}}>
                                            <Box className="image-wrapper">
                                                <Box className="previewFrame">
                                                    <img className="previewImage" src="" />
                                                </Box>
                                            </Box>
                                            <Box display="flex" justifyContent="flex-end">
                                                <Button variant="outlined" color="secondary" onClick={edit}>{editButtonText}</Button>
                                                <Box sx={{ m: 1 }} />
                                                <Button variant="outlined" color="primary" disabled={isLocked} onClick={save}>Save</Button>
                                            </Box>
                                        </Box>}
                                    </ThemeProvider>
                                </>
                            );
                        }
                    }
                </OptionsContext.Consumer>
            </OptionsContext.Provider>
        </ErrorBoundary>
    )

    async function loadAsset(client: IContentHubClient, entityId: number) {
        var entity = await client.entities.getAsync(entityId, EntityLoadConfiguration.Full);
        
        if (entity == null) {
            console.log("Loading asset failed");
            return;
        }

        // MainFile not (yet) available (image may still be in media processing), display placeholder
        var mainFile = entity.getPropertyValue("MainFile") as IMainFile;
        console.log(mainFile);
        if (!mainFile || !mainFile.properties) {
            setShowPlaceHolder(true);
            setShowFocalPointViewer(false);
            return;
        }

        // retrieve main properties of asset to initalize focal point viewer
        const itemWidth = mainFile.properties.width;
        const itemHeight = mainFile.properties.height;
        const itemGroup = mainFile.properties.group;

        // focal point viewer not applicable for asset media types Videos and Documents (or other unforeseen asset types)
        if (itemGroup !== "Images" && itemGroup !== "Vectors") {
            setShowFocalPointViewer(false);
            return;
        }

        // ..

        console.log(entity.getPropertyValue("FocalPointX"));
        console.log(entity.getPropertyValue("FocalPointY"));

        return entity;
    }

    function initialize() {
        // doesn't work yet
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