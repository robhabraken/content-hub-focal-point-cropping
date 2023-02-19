import { IContentHubClient } from "@sitecore/sc-contenthub-webclient-sdk/dist/clients/content-hub-client";
import { CultureLoadOption } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/culture-load-option";
import { ICultureInsensitiveProperty  } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/base/culture-insensitive-property";
import { RelationRole } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/base";
import { Entity, IEntity } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/base/entity";
import { EntityLoadConfiguration } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/entity-load-configuration";
import React, { useCallback, useEffect, useState, useRef } from "react";
import ErrorBoundary from "./errorBoundary";
import { Box, Button, Container, CircularProgress, Icon, TableBody, TableCell, TableContainer, TableRow, ThemeProvider, Typography } from "@mui/material";
import PhotoIcon from '@mui/icons-material/Photo';
import { ContentHubPageProps, ConversionConfiguration, IContentHubContext, IMainFile, FocalPoint, IRendition, Rendition } from "./types";

const OptionsContext = React.createContext<ContentHubPageProps>(new ContentHubPageProps);

export const FocalPointEditor = ({ context }: { context: IContentHubContext }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [entity, setEntity] = useState<IEntity>();
    
    const [showPlaceHolder, setShowPlaceHolder] = useState(false);
    const [showFocalPointViewer, setShowFocalPointViewer] = useState(true);

    const previewImage = useRef<HTMLImageElement>(null);
    const focalCanvas = useRef<HTMLCanvasElement>(null);

    const [editButtonText, setEditButtonText] = useState("Edit");

    const [isLocked, setIsLocked] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [remove, setRemove] = useState(false);

    const focalPointRadius = 20;

    const [itemWidth, setItemWidth] = useState(0);
    const [itemHeight, setItemHeight] = useState(0);
    const [focalPoint, setFocalPoint] = useState(new FocalPoint());
    const [ratio, setRatio] = useState(0.0);

    const [previewImageSrc, setPreviewImageSrc] = useState("");
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
                    setEntity(entity);
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
                                                        <img ref={previewImage} src={previewImageSrc} style={{ maxWidth: '100%' }} />
                                                        <canvas ref={focalCanvas} style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            zIndex: 20,
                                                            userSelect: 'none'
                                                        }}
                                                            onMouseDown={focalCanvasMouseDown}
                                                            onMouseMove={focalCanvasMouseMove}
                                                            onMouseUp={focalCanvasMouseUp}
                                                            onMouseLeave={focalCanvasMouseLeave}
                                                        ></canvas>
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
        setItemWidth(mainFile.properties.width);
        setItemHeight(mainFile.properties.height);
        var itemGroup = mainFile.properties.group;

        // focal point viewer not applicable for asset media types Videos and Documents (or other unforeseen asset types)
        if (itemGroup !== "Images" && itemGroup !== "Vectors") {
            setShowFocalPointViewer(false);
            return;
        }

        var focalPointX = entity.getProperty<ICultureInsensitiveProperty>("FocalPointX");
        if (focalPointX) {
            setFocalPointXProperty(focalPointX);
        }
        
        var focalPointY = entity.getProperty<ICultureInsensitiveProperty>("FocalPointY");
        if (focalPointY) {
            setFocalPointYProperty(focalPointY);
        }
        
        setPreviewImage(entityId);

        return entity;
    }
    
    function setPreviewImage(entityId: number) {
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
                                        setPreviewImageSrc(href);
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
            saveFocalPoint();
            lock();
        }
    }

    function resize() {
        if (!isResizing) {
            setIsResizing(true);

            // limit the amount of resize events by handling one every half a second
            setTimeout(() => {
                setIsResizing(false);

                // if the window is resized, the preview image has a different dimension,
                // requiring us to recalculate the ratio and redraw the focal point in the correct dimensions
                // otherwise the mouse events wouldn't be bound to the correct relative location within the image
                previewImageLoaded();

                // also revert back to locked state, as resizing the window is seen as cancelling the focal point editing action
                if (!isLocked) {
                    lock();
                }
            }, 50);
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

    // TODO: ISSUE: on the first call (when the page is rendered and initialize is executed, previewImageLoaded doens't work because
    // all the values are 0 that will be set by setState eventually...)

    function previewImageLoaded() {
        console.log("previewImageLoaded");
        if (!previewImage.current || !focalCanvas.current) {
            return;
        }

        var previewWidth = previewImage.current.width;
        setRatio(itemWidth / previewWidth);

        clear();

        focalCanvas.current.width = previewImage.current.width;
        focalCanvas.current.height = previewImage.current.height;

        var focalPointX = focalPointXProperty ? focalPointXProperty.getValue() as number : 0;
        var focalPointY = focalPointYProperty ? focalPointYProperty.getValue() as number : 0;

        if (focalPointX && focalPointX != 0 && focalPointY && focalPointY != 0) {
            focalPoint.x = focalPointX / ratio;
            focalPoint.y = focalPointY / ratio;

            draw();
        }
    }

    function getOffsetX(sender: any) {
        var test = sender.currentTarget.getBoundingClientRect();
        return Math.round(sender.pageX - window.pageXOffset - test.left)
    }

    function getOffsetY(sender: any) {
        var test = sender.currentTarget.getBoundingClientRect();
        return Math.round(sender.pageY - window.pageYOffset - test.top);
    }

    function focalCanvasMouseDown(sender: any) {
        console.log("focalCanvasMouseDown");
        if (isLocked) {
            return;
        }
        
        var x = getOffsetX(sender),
            y = getOffsetY(sender);

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

    function focalCanvasMouseMove(sender: any) {
        console.log("focalCanvasMouseMove");
        if (isLocked) {
            return;
        }

        if (isDragging) {

            // if clicked and started dragging, user is picking up focal point, not clicking to remove
            setRemove(false);

            // update focal point and marker while dragging
            focalPoint.x = getOffsetX(sender);
            focalPoint.y = getOffsetY(sender);
            draw();
        }
    }

    function focalCanvasMouseUp(sender: any) {
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

    function focalCanvasMouseLeave(sender: any) {
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

    function endSelection(sender: any) {
        console.log("endSelection");
        setIsDragging(false);

        var x = getOffsetX(sender),
            y = getOffsetY(sender);
        
        focalPoint.x = x;
        focalPoint.y = y;

        draw();
    }

    async function saveFocalPoint() {
        console.log("saveFocalPoint");
        var x = Math.ceil(focalPoint.x * ratio),
            y = Math.ceil(focalPoint.y * ratio);

        // keep focal point within bounding box of image dimensions in case of dragging cursor off canvas
        x = Math.max(Math.min(x, itemWidth), 0);
        y = Math.max(Math.min(y, itemHeight), 0);

        // store the focal point coordinates on the asset
        focalPointXProperty?.setValue(x);
        focalPointYProperty?.setValue(y);

        if (entity) {
            await context.client.entities.saveAsync(entity);
        }
    }

    // TODO: ISSUE: removing only works _after_ storing the focal point (save and edit), not when deleting a freshly placed focal point..

    function removeFocalPoint() {
        console.log("removeFocalPoint");
        setIsDragging(false);
        setRemove(false);

        setFocalPoint(new FocalPoint());
        clear();
    }

    function clear() {
        console.log("clear");

        if (!focalCanvas.current) {
            return;
        }
        
        var ctx = focalCanvas.current.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, focalCanvas.current.width, focalCanvas.current.height);
        }
    }

    function draw() {
        console.log("draw");
        clear();

        if (!focalCanvas.current) {
            return;
        }
        
        var ctx = focalCanvas.current.getContext('2d');
        if (ctx) {
            // draws the small white outer ring for contrast
            ctx.beginPath();
            ctx.arc(focalPoint.x, focalPoint.y, focalPointRadius + 1, 0, 2 * Math.PI, false);
            ctx.strokeStyle = 'rgba(255,255,255,1)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // draws the main see-through marker with (customizable) outline color
            ctx.beginPath();
            ctx.arc(focalPoint.x, focalPoint.y, focalPointRadius, 0, 2 * Math.PI, false);
            ctx.strokeStyle = 'rgba(255,0,0,0.5)';
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
        }
    }
}