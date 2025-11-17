export interface DiscoveryConfigurationSchema {
    scope: 'off' | 'open-editors' | 'open-workspaces';
}

export const defaultDiscoveryConfigurationSchema: DiscoveryConfigurationSchema = {
    scope: 'open-workspaces',
};
