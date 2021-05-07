var self = this;
self.fp = null;

var resizing = false;

var entityLoadedSubscription = options.mediator.subscribe("entityLoaded", function (entity) {
    if(self.fp == null) {
        self.fp = new FocalPointsExtension();
        self.fp.initialize(entity);
    }
});

var entityUnloadedSubscription = options.mediator.subscribe("entityUnloaded", function (entity) {
    self.fp.dispose();
});

FocalPointsExtension = function () {
    this._focalPoint = {};
    this._focalPointRadius = 20;

    this._locked = true;

    this._drag = false;
    this._remove = false;

    this._previewImageLoadedDelegate = null;
    this._focalCanvasMouseDownDelegate = null;
    this._focalCanvasMouseMoveDelegate = null;
    this._focalCanvasMouseUpDelegate = null;
    this._focalCanvasMouseLeaveDelegate = null;
}

FocalPointsExtension.prototype = {
    initialize: function (entity) {
        this._item = entity;

        // MainFile not (yet) available, display placeholder
        if (!this._item.properties["MainFile"]().properties) {
            document.getElementById("imagePlaceholder").style.display = "block";
            $('#focalPointViewer').remove();
            return;
        }

        // retrieve main properties of asset to initalize focal point viewer
        this._itemWidth = this._item.properties["MainFile"]().properties.width;
        this._itemHeight = this._item.properties["MainFile"]().properties.height;
        this._itemGroup = this._item.properties["MainFile"]().properties.group;

        // focal point viewer not applicable for asset media types Videos and Documents (or other unforeseen asset types)
        if(this._itemGroup !== "Images" && this._itemGroup !== "Vectors") {
            $('#focalPointViewer').remove();
            return;
        }

        this._previewImage = $('.previewImage')[0];
        this._previewImageLoadedDelegate = this._previewImageLoaded.bind(this);
        this._previewImage.addEventListener("load", this._previewImageLoadedDelegate);

        $(this._previewImage).attr('src', this._item.renditions().downloadPreview[0].href);

        $(this._previewImage).wrap("<div id='focalPointContainer' style='display:inline-block;position:relative;'></div>");
        $('<canvas id="focalCanvas" style="width:100%;height:100%;position:absolute;top:0px;left:0px;z-index:20;-webkit-touch-callout: none;-webkit-user-select: none;-khtml-user-select: none;-moz-user-select: none;-ms-user-select: none;user-select: none;"></canvas>').appendTo('#focalPointContainer');

        $('#imagePlaceholder').remove();

        this._focalCanvas = $('#focalCanvas')[0];

        this._ctx = this._focalCanvas.getContext('2d');

        this._focalCanvasMouseDownDelegate = this._focalCanvasMouseDown.bind(this);
        this._focalCanvas.addEventListener("mousedown", this._focalCanvasMouseDownDelegate);

        this._focalCanvasMouseMoveDelegate = this._focalCanvasMouseMove.bind(this);
        this._focalCanvas.addEventListener("mousemove", this._focalCanvasMouseMoveDelegate);

        this._focalCanvasMouseUpDelegate = this._focalCanvasMouseUp.bind(this);
        this._focalCanvas.addEventListener("mouseup", this._focalCanvasMouseUpDelegate);

        this._focalCanvasMouseLeaveDelegate = this._focalCanvasMouseLeave.bind(this);
        this._focalCanvas.addEventListener("mouseleave", this._focalCanvasMouseLeaveDelegate);

        $("<span class='sfExample'></span>").appendTo('.sfPreviewVideoFrame');

        // initialization ready, bind the unlock button (toggling locking the focal point editing mode)
        $('#toggleLockFocalPoint').click(function(){
            if(self.fp._locked) {
                self.fp._unlock();
            } else {
                self.fp._previewImageLoaded();
                self.fp._lock();
            }
        });

        // bind the save button to save the focal point data onto the asset when in editing mode
        $('#saveFocalPoint').click(function(){
            if(!self.fp._locked) {
                self.fp._setFocalPoint();
                self.fp._lock();
            }
        });

        window.addEventListener('resize', function(event) {
            if (!resizing) {
                resizing = true;

                // limit the amount of resize events by handling one every half a second
                setTimeout(() => {
                    resizing = false;

                    // if the window is resized, the preview image has a different dimension,
                    // requiring us to recalculate the ratio and redraw the focal point in the correct dimensions
                    // otherwise the mouse events wouldn't be bound to the correct relative location within the image
                    self.fp._previewImageLoaded();

                    // also revert back to locked state, as resizing the window is seen as cancelling the focal point editing action
                    if(!self.fp._locked) {
                        self.fp._lock();
                    }
                }, 50);
            }
        }, true);
    },

    dispose: function () {
        if (this._previewImageLoadedDelegate) {
            delete this._previewImageLoadedDelegate;
        }
        if (this._focalCanvasMouseDownDelegate) {
            delete this._focalCanvasMouseDownDelegate;
        }
        if (this._focalCanvasMouseMoveDelegate) {
            delete this._focalCanvasMouseMoveDelegate;
        }
        if (this._focalCanvasMouseUpDelegate) {
            delete this._focalCanvasMouseUpDelegate;
        }
        if (this._focalCanvasMouseLeaveDelegate) {
            delete this._focalCanvasMouseLeaveDelegate;
        }

        if (this._previewImage) {
            this._previewImage.removeEventListener("load", this._previewImageLoadedDelegate);
        }

        if (this._focalCanvas) {
            this._focalCanvas.removeEventListener("mousedown", this._focalCanvasMouseDownDelegate);
            this._focalCanvas.removeEventListener("mousemove", this._focalCanvasMouseMoveDelegate);
            this._focalCanvas.removeEventListener("mouseup", this._focalCanvasMouseUpDelegate);
            this._focalCanvas.removeEventListener("mouseleave", this._focalCanvasMouseLeaveDelegate);
        }
    },

    _lock: function() {
        document.getElementById("toggleLockFocalPoint").innerHTML = 'Edit';
        $('#saveFocalPoint').addClass('disabled');
        this._locked = true;
    },

    _unlock: function() {
        document.getElementById("toggleLockFocalPoint").innerHTML = 'Cancel';
        $('#saveFocalPoint').removeClass('disabled');
        this._locked = false;
    },

    _previewImageLoaded: function (sender, args) {
        var previewWidth = this._previewImage.width;
        this._ratio = this._itemWidth / previewWidth;

        this._clear();

        this._focalCanvas.width = this._previewImage.width;
        this._focalCanvas.height = this._previewImage.height;

        if (this._item.properties['FocalPointX']() !== null && this._item.properties['FocalPointX']() != 0 && this._item.properties['FocalPointY']() !== null && this._item.properties['FocalPointY']() != 0) {
            this._focalPoint.x = this._item.properties['FocalPointX']() / this._ratio;
            this._focalPoint.y = this._item.properties['FocalPointY']() / this._ratio;

            this._draw();
        }
    },

    _focalCanvasMouseDown: function (sender, args) {
        if(this._locked) {
            return;
        }

        var x = sender.offsetX,
            y = sender.offsetY;

        // if cursor is over focal point marker, assume remove (unless started dragging later on)
        if (this._item.properties['FocalPointX']() > 0 && this._item.properties['FocalPointY']() > 0) {
            if (this._cursorIsInFocalPointMarker(x, y)) {
                this._remove = true;
            }
        }

        this._beginSelection(x, y);
        event.preventDefault();
    },

    _focalCanvasMouseMove: function (sender, args) {
        if(this._locked) {
            return;
        }

        if (this._drag) {

            // if clicked and started dragging, user is picking up focal point, not clicking to remove
            this._remove = false;

            // update focal point and marker while dragging
            this._focalPoint.x = sender.offsetX;
            this._focalPoint.y = sender.offsetY;
            this._draw();
        }
    },

    _focalCanvasMouseUp: function (sender, args) {
        if(this._locked) {
            return;
        }

        if(this._remove) {
            // focal point marker clicked without moving (dragging), so remove the focal point
            this._removeFocalPoint();
        } else {
            // focal point either added or dragged, mouse up determines final position, so process the new focal point location
            this._endSelection(sender);
        }
    },

    _focalCanvasMouseLeave: function (sender, args) {
        if(this._locked) {
            return;
        }

        if (this._drag) {
            // when leaving the canvas while dragging, assume final position
            this._endSelection(sender);
        }
    },

    _cursorIsInFocalPointMarker: function (x, y) {
        var isCollision = false;
        var offset = this._focalPointRadius;

        var left = this._focalPoint.x - offset,
            right = this._focalPoint.x + offset,
            top = this._focalPoint.y - offset,
            bottom = this._focalPoint.y + offset;

        if (x >= left && x <= right && y >= top && y <= bottom) {
            isCollision = true;
        }

        return isCollision;
    },

    _beginSelection: function (x, y) {
        this._focalPoint.x = x;
        this._focalPoint.y = y;
        this._drag = true;
    },

    _endSelection: function (sender) {
        this._drag = false;

        var x = sender.offsetX,
            y = sender.offsetY;

        this._focalPoint.x = x;
        this._focalPoint.y = y;

        this._draw();
    },

    _setFocalPoint: function () {
        var x = Math.ceil(this._focalPoint.x * this._ratio),
            y = Math.ceil(this._focalPoint.y * this._ratio);

        // keep focal point within bounding box of image dimensions in case of dragging cursor off canvas
        x = Math.max(Math.min(x, this._itemWidth), 0);
        y = Math.max(Math.min(y, this._itemHeight), 0);

        // store the focal point coordinates on the asset
        this._item.properties.FocalPointX(x);
        this._item.properties.FocalPointY(y);
        this._item.save();
    },

    _removeFocalPoint: function() {
        this._drag = false;
        this._remove = false;

        this._focalPoint = {};
        this._setFocalPoint();
        this._clear();
    },

    _clear: function () {
        this._ctx.clearRect(0, 0, this._focalCanvas.width, this._focalCanvas.height);
    },

    _draw: function () {
        this._clear();
        
        // draws the small white outer ring for contrast
        this._ctx.beginPath();
        this._ctx.arc(this._focalPoint.x, this._focalPoint.y, this._focalPointRadius + 1, 0, 2 * Math.PI, false);
        this._ctx.strokeStyle = 'rgba(255,255,255,1)';
        this._ctx.lineWidth = 1;
        this._ctx.stroke();

        // draws the main see-through marker with (customizable) outline color
        this._ctx.beginPath();
        this._ctx.arc(this._focalPoint.x, this._focalPoint.y, this._focalPointRadius, 0, 2 * Math.PI, false);
        this._ctx.strokeStyle = 'rgba(255,0,0,0.5)';
        this._ctx.fillStyle = 'rgba(255,255,255,0.5)';
        this._ctx.lineWidth = 2;
        this._ctx.fill();
        this._ctx.stroke();
    }
}