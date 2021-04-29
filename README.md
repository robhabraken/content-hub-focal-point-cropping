# Content Hub - Focal point cropping

This extension adds focal point cropping functionality to Content Hub. This consists of additional asset data (the focal point), an external page component to visually select the desired focal point on the asset preview image, and functionality to automatically generate a number of public link croppings based on the chosen focal point. On top of that, to have a convenient overview of the available croppings and the effect of the chosen focal point, I have built an external page component that shows a clickable preview of all available public links of the asset.

## Configuration / Installation

This Content Hub extension relies on the *Internal integration* principle meaning that the custom business logic is configured inside Content Hub and the accompanying scripts are managed, built and run from the Content Hub servers. No additional applications are required, but you need to add some custom configuration to your Content Hub instance via the `Manage` button in the top right corner:

### Schema

Go the the  *Schema* of `M.Asset` and add a `New group` with the following properties:

* Name: FocalPoint
* Label: Focal point

Add a `New member`, `select` the member type *property* and from the dropdown select the `Integer` *data type* with the properties:

* Name: FocalPointX
* Label: Focal point X-axis coordinate
* You can leave the rest of the properties default

And another member following the same procedure with the properties:

* Name: FocalPointY
* Label: Focal point Y-axis coordinate

Click `Publish` to publish the new schema for your assets.

### Scripts

Create a new *Script* with the following properties:

* Name: DAM - Create public links for croppings
* Type: Action

Go to the Script editor by clicking `Edit` on the newly created Script entity and paste the code from the file 

[Scripts/DAM - Create public links for croppings.cs](Scripts/DAM%20-%20Create%20public%20links%20for%20croppings.cs)

 into the Script editor. `Save changes`, `Build` and `Publish` the code. Go back to the Scripts overview by clicking the `Close` button and enable the Script by toggling the `Enable control` slide on.

### Actions

Create a new *Action* with the following properties:

* Name: DAM - Create public links for croppings
* Type: Action scrpit
* Script: DAM - Create public links for croppings

### Triggers

Create a new *Trigger* with the following properties:

* General
  * Name: DAM - M.Asset - On focal point set
  * Objective: Entity modification
  * Execution type: In background
* Conditions
  * Add definition for Asset (M.Asset)
  * Add Condition FocalPointX has changed
  * Add Condition FocalPointY has changed
  * Set operator to OR for these conditions
  * Add another Condition one level up for MainFile has changed
  * Set operator to OR for this condition
* Actions
  * Add action DAM - Create public links for croppings

`Save and close` the trigger and click `Activate`.

### Transformations

Create a new *Transformation* with the following properties:

* Name: thumbnail
* Crop: None
* Width (px): 100
* Height (px): 100
* Quality: medium quality

This transformation will be used to display the public link thumbnails in the public link preview external page component.

### Media processing

To allow for resizing and cropping of Vector images we need to generate a bitmap version (rendition) of the asset once it is uploaded. Go to *Media processing* and click on the `Content` section on your left. Then, click the `Edit` icon for the *Vectors* flow.

Click on the large plus sign at the beginning of the flow to add a new task and select `Convert image`. Use the following parameters:

* Parameters
  * Name: bitmap_for_web
  * Content type: image/png
  * Content disposition: Inline
  * Resize option: Do not resize
  * Target extension: png
  * Color profile: sRGB default
  * Density (DPI): 72
* Outputs
  * Store output: toggle on
  * Output name: bitmap_for_web
  * Property: Renditions
  * Alternative files: toggle on
* Rendition link (Click `New link`)
  * Label: Bitmap for web
  * Intent: Download
  * Required permissions: Read
  * Intended area of use: Download, Public links

Click `Save task` on the bottom of the screen, than `Save` in the upper right corner. `Close` this flow to go back to the *Media processing* overview and click `Publish` to activate your changes. If you want to run this media processing flow for existing content you should also go to the *Assets* overview, select all applicable assets and click `Refresh conditions` under the fly out menu with the three little dots in the upper right corner. Newly uploaded assets will automatically be processed using this new configuration.

### External page components

Go to *Pages* and select the *Asset detail* page. We are going to replace the *Entity image viewer* with a new component called the *Focal point viewer*. Go to `Settings` of the *Entity image viewer* in Column 1 of the Main Zone and toggle the `Visible` slide off to hide the original component. Click on the plus sign on the bottom of Column 1 and search for *External*. Name your new component *"Focal point viewer"* and toggle the component `Visible`. Drag the item to the position below the original image viewer and click on the `Edit` option. Configure the properties as following:

* Control name: Custom.Controls.FocalPointViewer
* Code: [External page components/Focal point viewer.js](External%20page%20components/Focal%20point%20viewer.js)
* Template: [External page components/Focal point viewer.html](External%20page%20components/Focal%20point%20viewer.html)

`Save and close` the newly added component.

Add another component by clicking the plus sign within a column to your likings, for example on hte bottom of Column 1 and search for *External*. Name your new component "*Public links preview*" and toggle the component `Visible`. Configure the properties as following:

* Control name: Custom.Controls.PublicLinksPreview
* Resources: https://cdn.jsdelivr.net/npm/handlebars@latest/dist/handlebars.js
* Code: [External page components/Public links preview.js](External%20page%20components/Public%20links%20preview.js)
* Template: [External page components/Public links preview.js](External%20page%20components/Public%20links%20preview.js)

Save and close the newly added component and go to an asset to verify correct placement of both new components.

#### Optional: Show focal point details

This step isn't required as it isn't a functional part of the extension, but it does give some useful feedback on the focal point selection process if you like. Still on the *Asset detail* page of the *Pages* section, go to the Details component on the top of the second column (assuming a default Content Hub configuration). Toggle on the *Focal point* member group selection on the left side of the screen, select "White panel with shadow" as your Skin of choice and set both members on `Not editable`. After that you can `Save` the new *Details* component settings.