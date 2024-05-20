import React from "react";
import { createRoot } from "react-dom/client";
import { ContentHubClient } from "@sitecore/sc-contenthub-webclient-sdk/dist/clients/content-hub-client";
import { IExtendedContentHubClient } from "@sitecore/sc-contenthub-webclient-sdk/dist/clients/extended-client";
import { PublicLinkViewer } from "./publicLinkViewer";

interface IContentHubContext {
    config: any;
    options: IContentHubPageProps;
    entity: any;
    theme: any;
    user: any;
}

interface IContentHubPageProps {
    entityId: number;
    culture: string;
}

export default function createExternalRoot(
    container: HTMLElement,
    clientBuilder: (constructor: typeof ContentHubClient) => IExtendedContentHubClient
) {
    const root = createRoot(container);
    const client = clientBuilder(ContentHubClient);

    return {
        render(context: IContentHubContext) {
            root.render(<PublicLinkViewer context={context} client={client} />);
        },
        unmount() {
            root.unmount();
        }
    }
};
