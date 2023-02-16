import ReactDOM from "react-dom";
import React from "react";
import { IContentHubClient } from "@sitecore/sc-contenthub-webclient-sdk/dist/clients/content-hub-client";
import { FocalPointEditor } from "./focalPointEditor";

interface IContentHubContext {
    options: IContentHubPageProps;
    client: IContentHubClient;
    entity: any;
    theme: any;
}

interface IContentHubPageProps {
    entityId: number;
    culture: string;
}

export default function createExternalRoot(container: HTMLElement) {
    return {
        render(context: IContentHubContext) {
            ReactDOM.render(
                <FocalPointEditor context={context} />
                ,
                container
            );
        },
        unmount() {
            ReactDOM.unmountComponentAtNode(container);
        }
    }
};
