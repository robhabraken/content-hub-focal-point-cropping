# Content Hub - Focal point cropping

This Content Hub extension relies on the *Internal integration* principle meaning that the custom business logic is configured inside Content Hub and the accompanying scripts are managed, built and run from the Content Hub servers. No additional applications are required, but you need to add some custom configuration to your Content Hub instance via the `Manage` button in the top right corner:

### Schema

Go the the  *Schema* of `M.Asset` and add a `New group` with the following properties:

* Name: FocalPoint
* Label: Focal point

Add a `New member`, `select` the member type *property* and from the dropdown select the `Integer` *data type* with the properties:

* Name: FocalPointX
* You can leave the rest of the properties default

And another member following the same procedure with the properties:

* Name: FocalPointY

Click `Publish` to publish the new schema for your assets.

### Scripts

Create a new *Script* with the following properties:

* Name: DAM - Create public links for croppings
* Type: Action

Go to the Script editor by clicking `Edit` on the newly created Script entity and paste the code from the file 

[Script/DAM - Create public links for croppings.cs]: Script/DAM - Create public links for croppings.cs

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
* Actions
  * Add action DAM - Create public links for croppings

`Save and close` the trigger and click `Activate`.

