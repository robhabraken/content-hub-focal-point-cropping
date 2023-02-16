## Configuration / Installation
This folder contains the required scripts for the Focal point cropping page components when running on HTML/JSS (up until Content Hub version 4.1.x).

### External page components

Go to *Pages* and select the *Asset detail* page. Click on the plus sign on the bottom of Column 1 and search for *External*. Name your new component *"Focal point viewer"* and configure it as following:

* Title: Focal point viewer
* Visible: yes (toggle on)
* Nested: no
* container: Panel
* Show panel title: yes (toggle on)
* Collapsible: yes (toggle on)
* Collapsed by default: yes (toggle on)

Drag the item to the position below the original image viewer and click on the `Edit` option. Configure the properties as following:

* Control name: Custom.Controls.FocalPointViewer
* Code: [Focal point viewer.js](Focal%20point%20viewer.js)
* Template: [Focal point viewer.html](Focal%20point%20viewer.html)

`Save and close` the newly added component.

Add another component by clicking the plus sign within a column to your likings, for example on the bottom of Column 1 and search for *External*. Name your new component "*Public links preview*" and toggle the component `Visible`. This also should be shown in a container, but not collapsed by default. Configure the properties as following:

* Control name: Custom.Controls.PublicLinksPreview
* Resources: https://cdn.jsdelivr.net/npm/handlebars@latest/dist/handlebars.js
* Code: [Public links preview.js](Public%20links%20preview.js)
  * Replace the contentHubBaseUrl https://{your-content-hub-url}/ with your instance URL
* Template: [Public links preview.html](Public%20links%20preview.html)

Save and close the newly added component and go to an asset to verify correct placement of both new components.