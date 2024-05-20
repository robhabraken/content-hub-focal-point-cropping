import React from "react";
import { createRoot } from "react-dom/client";
import { IContentHubClient } from "@sitecore/sc-contenthub-webclient-sdk/dist/clients/content-hub-client";
import { FocalPointEditor } from "./focalPointEditor";

interface IContentHubContext {
    config: any;
    options: IContentHubPageProps;
    client: IContentHubClient;
    entity: any;
    theme: any;
    user: any;
}

interface IContentHubPageProps {
    entityId: number;
    culture: string;
}

export default function createExternalRoot(container: HTMLElement) {
    const root = createRoot(container);
    return {
        render(context: IContentHubContext) {
            root.render(<FocalPointEditor context={context} />);
        },
        unmount() {
            root.unmount();
        }
    }
};
