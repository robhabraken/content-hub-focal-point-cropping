import { IContentHubClient } from "@sitecore/sc-contenthub-webclient-sdk/dist/clients/content-hub-client";
import { CultureLoadOption } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/culture-load-option";
import { ICultureInsensitiveProperty  } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/base/culture-insensitive-property";
import { RelationRole } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/base";
import { Entity, IEntity } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/base/entity";
import { EntityLoadConfiguration } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/entity-load-configuration";
import React, { useEffect, useState } from "react";
import ErrorBoundary from "./errorBoundary";
import { Box, Button, Container, CircularProgress, Icon, TableBody, TableCell, TableContainer, TableRow, ThemeProvider, Typography } from "@mui/material";
import PhotoIcon from '@mui/icons-material/Photo';
import { ContentHubPageProps, ConversionConfiguration, IContentHubContext, IMainFile, FocalPoint, IRendition, Rendition } from "./types";

const OptionsContext = React.createContext<ContentHubPageProps>(new ContentHubPageProps);

export const FocalPointEditor = ({ context }: { context: IContentHubContext }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const [showPlaceHolder, setShowPlaceHolder] = useState(false);
    const [showFocalPointViewer, setShowFocalPointViewer] = useState(true);
    
    const [editButtonText, setEditButtonText] = useState("Edit");

    const [isLocked, setIsLocked] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [remove, setRemove] = useState(false);
    
    const [item, setItem] = useState<IEntity>(); // doesn't work yet

    var itemWidth = 0;
    var itemHeight = 0;

    const focalPointRadius = 20;
    var focalPoint = new FocalPoint(); // not yet tested / implemented
    var ratio = 0.0;

    const [previewImage, setPreviewImage] = useState("");
    const [focalPointXProperty, setFocalPointXProperty] = useState<ICultureInsensitiveProperty>(); 
    const [focalPointYProperty, setFocalPointYProperty] = useState<ICultureInsensitiveProperty>(); 

    useEffect(() => {
        window.addEventListener('resize', resize);

        if (!isLoading) {
            setIsLoading(true);

            console.log("Loading focal point editor");
            initialize(context.client, context.options.entityId)
               .then(entity => {
                    console.log("Focal point editor loaded");
                    setItem(entity);
                    setIsLoaded(true);
                });
        }

        return () => {
            window.removeEventListener('resize', resize);
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
                                        { showFocalPointViewer && <Box id="focalPointViewer">
                                            <Box marginBottom="16px">
                                                <Box className="previewFrame">
                                                    <Box id="focalPointContainer" display="inline-block" position="relative">
                                                        <img src={previewImage} style={{ maxWidth: '100%' }} />
                                                        <canvas id="focalCanvas" style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            zIndex: 20,
                                                            userSelect: 'none'
                                                        }} ></canvas>
                                                    </Box>
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

    async function initialize(client: IContentHubClient, entityId: number) {
        var entity = await client.entities.getAsync(entityId, EntityLoadConfiguration.Full);
        
        if (entity == null) {
            console.log("Loading asset failed");
            return;
        }

        // MainFile not (yet) available (image may still be in media processing), display placeholder
        var mainFile = entity.getPropertyValue("MainFile") as IMainFile;
        if (!mainFile || !mainFile.properties) {
            setShowPlaceHolder(true);
            setShowFocalPointViewer(false);
            return;
        }

        // retrieve main properties of asset to initalize focal point viewer
        itemWidth = mainFile.properties.width;
        itemHeight = mainFile.properties.height;
        var itemGroup = mainFile.properties.group;

        // focal point viewer not applicable for asset media types Videos and Documents (or other unforeseen asset types)
        if (itemGroup !== "Images" && itemGroup !== "Vectors") {
            setShowFocalPointViewer(false);
            return;
        }

        var focalPointX = entity.getProperty<ICultureInsensitiveProperty>("FocalPointX");
        setFocalPointXProperty(focalPointX!);
        
        var focalPointY = entity.getProperty<ICultureInsensitiveProperty>("FocalPointY");
        setFocalPointYProperty(focalPointY!);

        // TODO: load image and place on img element
        // TODO: load canvas and bind event listeners
        
        setPreviewImageUrl(entityId);

        // place delegate on preview image loaded

        return entity;
    }
    
    function setPreviewImageUrl(entityId: number) {
        fetch("https://" + window.location.hostname + "/api/entities/"+ entityId + "/renditions")
            .then(response => {
                return response.json()
            })
            .then(data => {
                var renditionsData = data["renditions"];
                if (renditionsData) {
                    for (var index = 0; index < renditionsData.length; index++) {
                        var renditionLink = renditionsData[index]["rendition_link"];
                        var name;
                        if (renditionLink) {
                            name = renditionLink["name"];
                            if (name != "downloadPreview") {
                                continue;
                            }
                        }

                        var fileLocation = renditionsData[index]["file_location"];
                        if (fileLocation) {
                            var files = fileLocation["files"];
                            if (files && files.length > 0) {
                                var file = files[0];
                                if (file) {
                                    var deliveryLink = file["delivery_link"];
                                    if (deliveryLink) {
                                        var href = deliveryLink["href"] ?? "";
                                        setPreviewImage(href);
                                        previewImageLoaded();
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            });
    }

    function edit() {
        console.log("edit " + isLocked);
        if (isLocked) {
            unlock();
        } else {
            previewImageLoaded();
            lock();
        }
    }

    function save() {
        console.log("save");
        if (!isLocked) {
            setFocalPoint();
            lock();
        }
    }

    function resize() {
        console.log("resize");
        console.log("isLocked ja? " + isLocked);
        previewImageLoaded();
        if (!isLocked) {
            lock();
        }
    }

    function lock() {
        console.log("lock");
        setEditButtonText("Edit");
        setIsLocked(true);
    }

    function unlock() {
        console.log("unlock");
        setEditButtonText("Cancel");
        setIsLocked(false);
    }

    function previewImageLoaded() {
        console.log("previewImageLoaded");
        // var previewWidth = this._previewImage.width; TODO
        // this._ratio = this._itemWidth / previewWidth; TODO

        clear();

        // this._focalCanvas.width = this._previewImage.width; TODO
        // this._focalCanvas.height = this._previewImage.height; TODO

        var focalPointX = focalPointXProperty ? focalPointXProperty.getValue() as number : 0;
        var focalPointY = focalPointYProperty ? focalPointYProperty.getValue() as number : 0;

        if (focalPointX && focalPointX != 0 && focalPointY && focalPointY != 0) {
            focalPoint.x = focalPointX / ratio;
            focalPoint.y = focalPointY / ratio;

            draw();
        }
    }

    function focalCanvasMouseDown(sender: any, args: any) { // check types
        console.log("focalCanvasMouseDown");
        if (isLocked) {
            return;
        }

        var x = sender.offsetX,
            y = sender.offsetY;

            var focalPointX = focalPointXProperty ? focalPointXProperty.getValue() as number : 0;
            var focalPointY = focalPointYProperty ? focalPointYProperty.getValue() as number : 0;

        // if cursor is over focal point marker, assume remove (unless started dragging later on)
        if (focalPointX && focalPointX > 0 && focalPointY &&  focalPointY > 0) {
            if (cursorIsInFocalPointMarker(x, y)) {
                setRemove(true);
            }
        }

        beginSelection(x, y);
        sender.stopPropagation();
        sender.nativeEvent.stopImmediatePropagation();
    }

    function focalCanvasMouseMove(sender: any, args: any) { // check types
        console.log("focalCanvasMouseMove");
        if (isLocked) {
            return;
        }

        if (isDragging) {

            // if clicked and started dragging, user is picking up focal point, not clicking to remove
            setRemove(false);

            // update focal point and marker while dragging
            focalPoint.x = sender.offsetX;
            focalPoint.y = sender.offsetY;
            draw();
        }
    }

    function focalCanvasMouseUp(sender: any, args: any) { // check types
        console.log("focalCanvasMouseUp");
        if (isLocked) {
            return;
        }

        if (remove) {
            // focal point marker clicked without moving (dragging), so remove the focal point
            removeFocalPoint();
        } else {
            // focal point either added or dragged, mouse up determines final position, so process the new focal point location
            endSelection(sender);
        }
    }

    function focalCanvasMouseLeave(sender: any, args: any) { // check types
        console.log("focalCanvasMouseLeave");
        if (isLocked) {
            return;
        }

        if (isDragging) {
            // when leaving the canvas while dragging, assume final position
            endSelection(sender);
        }
    }

    function cursorIsInFocalPointMarker(x: number, y: number) {
        console.log("cursorIsInFocalPointMarker");
        var isCollision = false;
        var offset = focalPointRadius;

        var left = focalPoint.x - offset,
            right = focalPoint.x + offset,
            top = focalPoint.y - offset,
            bottom = focalPoint.y + offset;
        
        if (x >= left && x <= right && y >= top && y <= bottom) {
            isCollision = true;
        }

        return isCollision;
    }

    function beginSelection(x: number, y: number) {
        console.log("beginSelection");
        focalPoint.x = x;
        focalPoint.y = y;
        setIsDragging(true);
    }

    function endSelection(sender: any) { // check types
        console.log("endSelection");
        setIsDragging(false);

        var x = sender.offsetX,
            y = sender.offsetY;
        
        focalPoint.x = x;
        focalPoint.y = y;

        draw();
    }

    function setFocalPoint() {
        console.log("setFocalPoint");
        var x = Math.ceil(focalPoint.x * ratio),
            y = Math.ceil(focalPoint.y * ratio);

        // keep focal point within bounding box of image dimensions in case of dragging cursor off canvas
        x = Math.max(Math.min(x, itemWidth), 0);
        y = Math.max(Math.min(y, itemHeight), 0);

        // store the focal point coordinates on the asset
        focalPointXProperty?.setValue(x);
        focalPointYProperty?.setValue(y);
    }

    function removeFocalPoint() {
        console.log("removeFocalPoint");
        setIsDragging(false);
        setRemove(false);

        focalPoint = new FocalPoint();
        setFocalPoint();
        clear();
    }

    function clear() {
        console.log("clear");
        // TODO: clear canvas
    }

    function draw() {
        console.log("draw");
        clear();

        // TODO: draw ring and marker
    }
}