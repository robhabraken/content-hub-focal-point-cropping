# Content Hub - Focal point cropping v3.1

This extension adds focal point cropping functionality to Content Hub. This consists of additional asset data (the focal point), an external page component to visually select the desired focal point on the asset preview image, and functionality to automatically generate a number of public link croppings based on the chosen focal point. On top of that, to have a convenient overview of the available croppings and the effect of the chosen focal point, I have built an external page component that shows a clickable preview of all available public links of the asset.

Change log:
* v1.1 now supports videos and documents too, utilizes a better integration of the focal point selector, and has an edit state to limit regeneration of public links and prevent accidental changes to the focal point.
* v2.0 introduces scaling based on ratio rather than image size, to limit the amount of required dimensions, keeping the scaled public link image as large as possible at the same time; also, it now is possible to omit resizing or cropping to be able to add public links using the original size and ratio.
* v2.1 dropped the trigger to listen to changed renditions, as it causes performance issues and race conditions when regenerating a large amount of assets.
* v2.2 introduces a fixed sorting order of displaying public links in the preview (external page component).
* v3.0 includes a completely new set of page components ported to React to use in version 4.2.x and up. Also, these components are now styled using Material UI instead of hard-coded CSS copied from the Content Hub UI itself, and use the Content Hub JavaScript SDK for reading and updating entity properties.
* v3.1 adds the possibility of using custom names for your ratio based croppings.
* v3.2 adds a member in the focal point group of the asset schema to store the username of the user who set this focal point. Has updated Window properties (replacing deprecated aliases).

For more information, context and a video demo of the module and its configuration, check out:

* [https://www.robhabraken.nl/index.php/4106/content-hub-focal-point-crop/](https://www.robhabraken.nl/index.php/4106/content-hub-focal-point-crop/)
* [https://www.robhabraken.nl/index.php/4203/focal-point-crop-v1-1/](https://www.robhabraken.nl/index.php/4203/focal-point-crop-v1-1/)
* [https://www.robhabraken.nl/index.php/4255/focal-point-crop-2-0/](https://www.robhabraken.nl/index.php/4255/focal-point-crop-2-0/)
* [https://www.robhabraken.nl/index.php/4575/focal-point-crop-3-0/](https://www.robhabraken.nl/index.php/4575/focal-point-crop-3-0/)
* [https://www.robhabraken.nl/index.php/4623/naming-public-links-for-cropping-ratios/](https://www.robhabraken.nl/index.php/4623/naming-public-links-for-cropping-ratios/)

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

And another integer member following the same procedure with the properties:

* Name: FocalPointY
* Label: Focal point Y-axis coordinate

Add a `New member`, `select` the member type *property* and from the dropdown select the `String` *data type* with the properties:

* Name: FocalPointModifiedBy
* Label: Focal point set by

Click `Publish` or `Apply changes` (depending on your Content Hub version) to publish the new schema for your assets.

### Scripts

Create a new *Script* with the following properties:

* Name: DAM - Create public links for croppings
* Type: Action

Go to the Script editor by clicking `Edit` on the newly created Script entity and paste the code from the file 

[Scripts/DAM - Create public links for croppings.cs](Scripts/DAM%20-%20Create%20public%20links%20for%20croppings.cs)

 into the Script editor. `Save changes`, `Build` and `Publish` the code. Go back to the Scripts overview by clicking the `Close` or back button (depending on your Content Hub version) and enable the Script by toggling the `Enable control` slide on.

 _Mind that you have a choice when it comes to naming your automatically generated public links. You can switch scenarios within the method 'AddCroppingDefinition' of this script. By default it uses the asset Identifier, which is unique and stable and non-discoverable. You can also opt for using the asset ID, which is more clean and shorter, but would allow people to discover other public links when they now the format. If you only publish approved images in Content Hub, this doesn't have to be an issue, but be aware of that. Lastly, you could use the asset title if you are looking for a more human friendly URL, though be aware that the title can be changed once an asset has been created, effectively changing the public link URLs, not updating former usages of the links; so this would be less reliable if you are running integrations with Content Hub or if you want to update current usages of your asset's public links as well._ 

 ### Configure desired public link croppings / ratios
The script installed in the previous step automatically generates a number of public links with various dimensions and ratios, also known as croppping definitions. These are added in the script via the function `AddCroppingDefinition`. This function has 6 parameters. The first parameter is a boolean that indicates if you want to crop the original. If you use the value 'false', the script will omit any cropping logic and copy over the original image into the public link. If you set this boolean to 'true', you can further configure the desired cropping details.

 The following two parameters can be used to configure a public link with a specific fixed dimension (width x height); the next two parameters can be used to configure a desired ratio, where the script will crop to the largest possible dimension of that ratio within the original image (this method is preferred over the fixed pixel dimension, as you want to downscale to a specific dimension using transformations anyway); and lastly, there is an optional string parameter that you can use to configure a name for a ratio, which will be used to name the public link and further reference that specific ratio.

The example script contains all four scenarios. It is advised to adjust this list to your needs:
* Edit the script installed in previous step (*DAM - Create public links for croppings*)
* Scroll down to the section `configure auto-generated croppings` and add or remove the desired CroppingDefinitions

For information on how these work, see the blog posts mentioned above (especially version 1.1 and 2.0).

### Actions

Create a new *Action* with the following properties:

* Name: DAM - Create public links for croppings
* Label: DAM - Create public links for croppings 
* Type: Action script
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
  * Add another Condition for MainFile has changed
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

Create transformations for *all* desired image sizes. If you only enter a fixed width, you can combine them with public links based on ratios perfectly well. For example:

* Name: w1024
* Crop: None
* Width (px): 1024
* Quality: high quality

Mind that maximum quality creates images that might be too big for web purposes. Carefully select between medium and high quality, depending on the desired file size, for optimal performance.

### Media processing

To allow for resizing and cropping of Vector images we need to generate a bitmap version (rendition) of the asset once it is uploaded. Go to *Media processing* and click on the `Content` section on your left. Then, click the `Edit` icon or on the row of the *Vectors* flow (depending on your Content Hub version).

Click on the large plus sign at the beginning of the flow to add a new task and select `Convert image`. Use the following parameters:

* Parameters
  * Name: bitmap_for_web
  * Content type: image/jpeg
  * Content disposition: Inline
  * Resize option: Do not resize
  * Target extension: jpg
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

Click `Save ` at the bottom of the popup, then `Save task` on the bottom of the screen, than `Save` in the upper right corner. `Close` this flow to go back to the *Media processing* overview and click `Publish` to activate your changes. If you want to run this media processing flow for existing content you should also go to the *Assets* overview, select all applicable assets and click `Refresh conditions` under the fly out menu with the three little dots in the upper right corner. Newly uploaded assets will automatically be processed using this new configuration.

### External page components

Install the external page components that match your Content Hub version: versions up to 4.1.x typically use the HTML and JavaScript components, included in the folder [External page components](External%20page%20components). If you are running on Content Hub 4.2.x and up, you should use the React components included in the folder [React page components](React%20page%20components). Both folders have their own readme file with instructions on how to install them. Please note that even if you run 4.2.x in compatibility mode and / or disabled React in the Content Hub Settings, the HTML components do not function as intended; they are not suitable to be run in compatible or hybrid React mode.

#### Optional: Show focal point details

This step isn't required as it isn't a functional part of the extension, but it does give some useful feedback on the focal point selection process if you like. Still on the *Asset detail* page of the *Pages* section, go to the Details component on the top of the second column (assuming a default Content Hub configuration). Toggle on the *Focal point* member group selection on the left side of the screen, select "White panel with shadow" as your Skin of choice and set both members on `Not editable`. After that you can `Save` the new *Details* component settings.
