import ReactDOM from "react-dom";
import React from "react";
import { IContentHubClient } from "@sitecore/sc-contenthub-webclient-sdk/dist/clients/content-hub-client";
import { PublicLinkViewer } from "./publicLinkViewer";

interface IContentHubContext {
    options: IContentHubPageProps;
    client: IContentHubClient;
    entity: any;
    theme: any;
}

interface IContentHubPageProps {
    entityId: number;
}

export default function createExternalRoot(container: HTMLElement) {
    return {
        render(context: IContentHubContext) {
            ReactDOM.render(
                <PublicLinkViewer context={context} />
                ,
                container
            );
        },
        unmount() {
            ReactDOM.unmountComponentAtNode(container);
        }
    }
};
