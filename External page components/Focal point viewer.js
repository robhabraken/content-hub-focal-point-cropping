var self = this;
self.fp = null;

var entityLoadedSubscription = options.mediator.subscribe("entityLoaded", function (entity) {
    self.fp = new FocalPointsExtension();
    self.fp.initialize(entity);
});

var entityUnloadedSubscription = options.mediator.subscribe("entityUnloaded", function (entity) {
    self.fp.dispose();
});

FocalPointsExtension = function () {
    this._entity = null;
    this._options = null;

    this._previewImage = null;

    this._focalCanvas = null;
    this._ctx = null;
    this._selection = {};
    this._drag = false;
    this._remove = false;

    this._item = {};
    this._ratioX = null;
    this._ratioY = null;

    this._dataBoundDelegate = null;

    this._focalCanvasMouseLeaveDelegate = null;
    this._focalCanvasMouseDownDelegate = null;
    this._focalCanvasMouseUpDelegate = null;
    this._focalCanvasMouseMoveDelegate = null;
    this._previewImageLoadedDelegate = null;
}

FocalPointsExtension.prototype = {
    initialize: function (entity) {
        this._item = entity;
        this._itemWidth = this._item.properties["MainFile"]().properties.width;
        this._itemHeight = this._item.properties["MainFile"]().properties.height;

        this._previewImage = $('.previewImage')[0];
        this._previewImageLoadedDelegate = this._previewImageLoaded.bind(this);
        this._previewImage.addEventListener("load", this._previewImageLoadedDelegate);

        $(this._previewImage).attr('src', this._item.renditions().downloadPreview[0].href);

        $(this._previewImage).wrap("<div id='focalPointContainer' style='display:inline-block;position:relative;'></div>");
        $('<canvas id="focalCanvas" style="width:100%;height:100%;position:absolute;top:0px;left:0px;z-index:20;-webkit-touch-callout: none;-webkit-user-select: none;-khtml-user-select: none;-moz-user-select: none;-ms-user-select: none;user-select: none;"></canvas>').appendTo('#focalPointContainer');

        this._focalCanvas = $('#focalCanvas')[0];

        this._ctx = this._focalCanvas.getContext('2d');

        this._focalCanvasMouseDownDelegate = this._focalCanvasMouseDown.bind(this);
        this._focalCanvas.addEventListener("mousedown", this._focalCanvasMouseDownDelegate);

        this._focalCanvasMouseUpDelegate = this._focalCanvasMouseUp.bind(this);
        this._focalCanvas.addEventListener("mouseup", this._focalCanvasMouseUpDelegate);

        this._focalCanvasMouseMoveDelegate = this._focalCanvasMouseMove.bind(this);
        this._focalCanvas.addEventListener("mousemove", this._focalCanvasMouseMoveDelegate);

        this._focalCanvasMouseLeaveDelegate = this._focalCanvasMouseLeave.bind(this);
        this._focalCanvas.addEventListener("mouseleave", this._focalCanvasMouseLeaveDelegate);

        $("<span class='sfExample'></span>").appendTo('.sfPreviewVideoFrame');
    },

    dispose: function () {
        if (this._dataBoundDelegate) {
            delete this._dataBoundDelegate;
        }
        if (this._focalCanvasMouseLeaveDelegate) {
            delete this._focalCanvasMouseLeaveDelegate;
        }
        if (this._focalCanvasMouseDownDelegate) {
            delete this._focalCanvasMouseDownDelegate;
        }
        if (this._focalCanvasMouseUpDelegate) {
            delete this._focalCanvasMouseUpDelegate;
        }
        if (this._focalCanvasMouseMoveDelegate) {
            delete this._focalCanvasMouseMoveDelegate;
        }
        if (this._previewImageLoadedDelegate) {
            delete this._previewImageLoadedDelegate;
        }

        if (this._previewImage) {
            this._previewImage.removeEventListener("load", this._previewImageLoadedDelegate);
        }
        if (this._focalCanvas) {
            this._focalCanvas.removeEventListener("mousedown", this._focalCanvasMouseDownDelegate);
            this._focalCanvas.removeEventListener("mouseup", this._focalCanvasMouseUpDelegate);
            this._focalCanvas.removeEventListener("mousemove", this._focalCanvasMouseMoveDelegate);
            this._focalCanvas.removeEventListener("mouseleave", this._focalCanvasMouseLeaveDelegate);
        }
    },

    _previewImageLoaded: function (sender, args) {
        var previewWidth = this._previewImage.width;
        this._ratio = this._itemWidth / previewWidth;

        this._clear();

        this._focalCanvas.width = this._previewImage.width;
        this._focalCanvas.height = this._previewImage.height;

        if (this._item.properties['FocalPointX']() !== null && this._item.properties['FocalPointX']() != 0 && this._item.properties['FocalPointY']() !== null && this._item.properties['FocalPointY']() != 0) {
            this._selection.startX = this._item.properties['FocalPointX']() / this._ratio;
            this._selection.startY = this._item.properties['FocalPointY']() / this._ratio;

            this._draw();
        }
    },

    _focalCanvasMouseDown: function (sender, args) {
        var x = sender.offsetX,
            y = sender.offsetY;
        if (this._item.properties['FocalPointX']() > 0 && this._item.properties['FocalPointY']() > 0) {
            if (this._isPointInFocalPointMarker(x, y)) {              
                this._remove = true;
                //return;
            }
        }

        this._beginSelection(x, y);

        event.preventDefault();
    },

    _focalCanvasMouseLeave: function (sender, args) {
        if (this._drag) {
            this._endSelection(sender);
        }
    },

    _focalCanvasMouseUp: function (sender, args) {
        if(!this._remove) {
            this._endSelection(sender);
        } else {
            this._removeFocalPoint();
        }
    },

    _removeFocalPoint: function() {
        this._selection = {};
        this._clear();

        this._setFocalPoint(0, 0);
        this._item.save();

        this._drag = false;
        this._remove = false;
    },

    _focalCanvasMouseMove: function (sender, args) {
        if (this._drag) {

            // if clicked and started dragging, user is picking up focal point, not clicking to remove
            this._remove = false;

            this._selection.startX = sender.offsetX;
            this._selection.startY = sender.offsetY;

            this._draw();
        }
    },

    _setFocalPoint: function (x, y) {
        // keep focal point within bounding box of image dimensions
        // to avoid an off image focal point (possible when quickly dragging mouse off canvas)
        x = Math.max(Math.min(x, this._itemWidth), 0);
        y = Math.max(Math.min(y, this._itemHeight), 0);

        this._item.properties.FocalPointX(x);
        this._item.properties.FocalPointY(y);
    },

    _beginSelection: function (x, y) {
        this._selection.startX = x;
        this._selection.startY = y;
        this._drag = true;
    },

    _endSelection: function (sender) {
        this._drag = false;

        var x = sender.offsetX,
            y = sender.offsetY;

        this._selection.startX = x;
        this._selection.startY = y;

        var x = Math.ceil(this._selection.startX * this._ratio),
            y = Math.ceil(this._selection.startY * this._ratio);

        this._setFocalPoint(x, y);
        this._draw();

        this._item.save();
    },

    _isPointInFocalPointMarker: function (x, y) {
        var isCollision = false;


        var left = this._selection.startX - 20,
            right = this._selection.startX + 20;
        var top = this._selection.startY - 20,
            bottom = this._selection.startY + 20;
        if (right >= x
            && left <= x
            && bottom >= y
            && top <= y) {
            isCollision = true;
        }

        return isCollision;
    },

    _clear: function () {
        this._ctx.clearRect(0, 0, this._focalCanvas.width, this._focalCanvas.height);
    },

    _draw: function () {
        this._clear();
        
        this._ctx.beginPath();
        this._ctx.arc(this._selection.startX, this._selection.startY, 21, 0, 2 * Math.PI, false);
        this._ctx.strokeStyle = 'rgba(255,255,255,1)';
        this._ctx.lineWidth = 1;
        this._ctx.stroke();

        this._ctx.beginPath();
        this._ctx.arc(this._selection.startX, this._selection.startY, 20, 0, 2 * Math.PI, false);
        this._ctx.strokeStyle = 'rgba(255,0,0,0.5)';
        this._ctx.fillStyle = 'rgba(255,255,255,0.5)';
        this._ctx.lineWidth = 2;
        this._ctx.fill();
        this._ctx.stroke();

    }
}