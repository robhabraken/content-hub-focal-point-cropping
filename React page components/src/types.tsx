import { IContentHubClient } from "@sitecore/sc-contenthub-webclient-sdk/dist/clients/content-hub-client";

export interface IContentHubPageProps {
    entityId: number;
    culture: string;
}

export class ContentHubPageProps implements IContentHubPageProps {
    entityId!: number;
    culture!: string;
}

export interface IContentHubContext {
    config: any;
    options: IContentHubPageProps;
    client: IContentHubClient;
    entity: any;
    theme: any;
    user: any;
}

export interface IRendition {
    label: string;
    contentType: string;
    width: number;
    height: number;
    href: string;
}

export class Rendition implements IRendition {
    label!: string;
    contentType!: string;
    width!: number;
    height!: number;
    href!: string;
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

export interface IFileProperties {
    width: number;
    height: number;
    group: string;
}

export interface IMainFile {
    locations: any;
    properties: IFileProperties;
}