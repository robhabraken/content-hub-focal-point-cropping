import { IContentHubClient } from "@sitecore/sc-contenthub-webclient-sdk/dist/clients/content-hub-client";

export interface IContentHubPageProps {
    entityId: number;
}

export class ContentHubPageProps implements IContentHubPageProps {
    entityId!: number;

}

export interface IContentHubContext {
    options: IContentHubPageProps;
    client: IContentHubClient;
    entity: any;
    theme: any;
}

export interface IRendition {
    label: string,
    contentType: string
}

export class Rendition implements IRendition {
    label!: string;
    contentType!: string;
}

export interface CroppingConfiguration {
    cropping_type: string;
    width: number;
    height: number;
}

export interface Ratio {
    name: string;
}

export interface ConversionConfiguration {
    cropping_configuration: CroppingConfiguration;
    original_width: number;
    original_height: number;
    width: number;
    height: number;
    ratio: Ratio;
}