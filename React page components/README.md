# Content Hub - Focal point cropping v3.0 Alpha

***IMPORTANT***
This is an alpha version of HTML components converted into React components. The current state is that the Public Link viewer has been converted.

In order to activate the Public Link viewer, execute the following steps:

 1. Goto `/React components` folder
 2. Run `npm install`. This will ensure that the package are downloaded and installed
 3. Run `npm run build`. This will trigger a build
 4. Goto `/dist` folder and copy `publicLinkViewer.js`
 5. Goto your Content Hub Instance
 6. Goto `Manage` -> `Portal assets` and click on `Upload files`
 7. Upload `publicLinkViewer.js`
 8. Wait for the background jobs to be finished.
 9. Goto the `Asset detail` page
 10. Add an `External page component` on the page
 11. Set the title to `Public link viewer` and click on `Add`
 12. Open `Settings`, set Container to `Panel` and switch Show panel title `ON` 
 13. Edit the component
 15. Change JS bundle to `From asset`
 16. Click on the + sign below `From asset` and select `publicLinkViewer.js`
 17. Hit `Save` twice
 18. Open the `Asset detail` page

## Known issues
1. The source Rendition is set properply set.
2. The width and heigth for the Original public link aren't set yet.
3. The Focal point viewer component hasn't been created yet.