# Content Hub - Focal point cropping v3.0.1

***IMPORTANT***
This is a work-in-progress version of the Focal point cropping HTML components converted into React components.

Prepare and build the React components locally

 1. Go to `/React page components` folder
 2. Run `npm install`. This will ensure that the packages are downloaded and installed
 3. Run `npm run build`. This will trigger a build

In order to install the Public Link viewer, execute the following steps:

 1. Go to `/dist` folder and copy `publicLinkViewer.js`
 2. Go to your Content Hub Instance
 3. Go to `Manage` -> `Portal assets` and click on `Upload files`
 4. Upload `publicLinkViewer.js`
 5. Wait for the background jobs to be finished.
 6. Go to `Manage` -> `Pages`
 7. Go to the `Asset details` page
 8. Add an `External` component on the page
 9. Set the title to `Public link viewer` and click on `Add`
 10. Open `Settings`, set Container to `Panel` and switch Show panel title `ON`
 11. Edit the component
 12. Change JS bundle to `From asset`
 13. Click on the + sign below `From asset` and select `publicLinkViewer.js`
 14. Hit `Save`
 15. Open the `Asset detail` page
 
In order to install the Focal point editor, execute the following steps:

 1. Go to `/dist` folder and copy `focalPointEditor.js`
 2. Go to your Content Hub Instance
 3. Go to `Manage` -> `Portal assets` and click on `Upload files`
 4. Upload `focalPointEditor.js`
 5. Wait for the background jobs to be finished.
 6. Go to `Manage` -> `Pages`
 7. Go to the `Asset details` page
 8. Add an `External` component on the page
 9. Set the title to `Focal point editor` and click on `Add`
 10. Open `Settings`, set Container to `Panel` and switch Show panel title `ON`
 11. Toggle Collapsible `ON`, and then Collapsed by default `ON`
 12. Edit the component
 13. Change JS bundle to `From asset`
 14. Click on the + sign below `From asset` and select `publicLinkViewer.js`
 15. Hit `Save`
 16. Open the `Asset detail` page

## Known issues
1. The Focal point editor component is under construction.
2. The styling doesn't completely comply with the Content Hub UI. I do not yet know how to adopt or apply the included overrides for the MuiTypography in the context.theme object for example (or any other MUI component). The body2 typography should be lighter (alpha 0.54, which I've temporarily added hardcoded), the overall margins should be less (mostly the outer padding), and the refresh button should be square for example. Maybe the ThemeProvider isn't necessary if I correctly apply the full theme override. I have filed a support ticket to get some guidance on this matter.