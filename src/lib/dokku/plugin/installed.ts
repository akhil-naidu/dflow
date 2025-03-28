import { NodeSSH } from 'node-ssh';

export const installed = async (
  ssh: NodeSSH,
  pluginName: string,
): Promise<boolean> => {
  const resultPluginInstalled = await ssh.execCommand(
    `dokku plugin:installed ${pluginName}`,
  );
  return resultPluginInstalled.code !== 1;
};
