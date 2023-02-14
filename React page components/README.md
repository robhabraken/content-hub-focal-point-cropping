# Content Hub - Focal point cropping v3.0 Alpha

***IMPORTANT***
This is an alpha version of the Focal point cropping HTML components converted into React components. Currently, only the Public Link viewer has been converted.

In order to install the Public Link viewer, execute the following steps:

 1. Go to `/React page components` folder
 2. Run `npm install`. This will ensure that the packages are downloaded and installed
 3. Run `npm run build`. This will trigger a build
 4. Go to `/dist` folder and copy `publicLinkViewer.js`
 5. Go to your Content Hub Instance
 6. Go to `Manage` -> `Portal assets` and click on `Upload files`
 7. Upload `publicLinkViewer.js`
 8. Wait for the background jobs to be finished.
 6. Go to `Manage` -> `Pages`
 9. Go to the `Asset details` page
 10. Add an `External` component on the page
 11. Set the title to `Public link viewer` and click on `Add`
 12. Open `Settings`, set Container to `Panel` and switch Show panel title `ON` 
 13. Edit the component
 15. Change JS bundle to `From asset`
 16. Click on the + sign below `From asset` and select `publicLinkViewer.js`
 17. Hit `Save`
 18. Open the `Asset detail` page

## Known issues
1. The source Rendition is not properply set.
2. The width and heigth for the Original public link aren't set yet.
3. The Focal point viewer component hasn't yet been created.
4. I suspect that the styles.css file isn't used or at least the defined class within isn't used. Either fix this and add styling or remove the redundant file. > Update, I now have included the class in he preview panel, check if it actually comes true as intended.
5. Retrieve label of current culture instead of default culture in publicLinkViewer