import path = require("path");
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  let customCommand = getCustomCommand();
  context.subscriptions.push(customCommand);
}

interface CommandConfig {
  execDirectory: string;
  switchDirectory: string;
  script: string;
  minSecond: number;
}
/**
 * 自定义命令
 * @returns
 */
function getCustomCommand() {
  return vscode.commands.registerCommand("custom.command", (uri) => {
    let pagePath: string = "";
    let projectPath: string = "";
    let mainTerminal: vscode.Terminal | null = null;
    // 从目录右键菜单进入
    if (uri) {
      pagePath = uri.path;
      // 快捷命令进入
    } else {
      // 获取当前工作区所有根文件夹数组
      const workspaceFolders = vscode.workspace.workspaceFolders;
      // 工作区暂无项目
      if (!workspaceFolders) {
        return vscode.window.showErrorMessage("工作区暂无项目");
        // 工作区根项目最多只支持一个
      } else if (workspaceFolders.length > 1) {
        return vscode.window.showErrorMessage("工作区根项目最多只支持一个");
        // 取第一个项目
      } else {
        const workspaceFolder = workspaceFolders[0];
        // 索引、项目名称、URL
        const { index, name, uri } = workspaceFolder;
        pagePath = uri.path;
      }
    }
    // 项目根地址
    projectPath = pagePath.substring(0, pagePath.indexOf("/jxapp/")) + "/jxapp";
    // 自定义配置路径
    const hiboxPath = `${pagePath}/hibox.json`;
    // 读取配置文件
    vscode.workspace.openTextDocument(hiboxPath).then(
      (doc) => {
        // 获取配置文件内容
        const config = doc.getText();
        // 配置为空
        if (!config) {
          return vscode.window.showErrorMessage("hibox.json内容为空");
        }
        const { customCommand } = JSON.parse(config);
        // 命令配置为空
        if (!customCommand) {
          return vscode.window.showErrorMessage(
            "hibox.json未配置customCommand"
          );
        }
        const { model, list } = customCommand;

        function run(list: Array<CommandConfig>, index: number) {
          if (index >= list.length) { 
            return;
          }
          const item: CommandConfig = list[index];
          const { execDirectory, switchDirectory, script, minSecond } = item;
          const terminal = getTerminal(model, execDirectory);
          if (switchDirectory) {
            terminal?.sendText(`cd ${path.join(projectPath, switchDirectory)}`);
          }
          // 输出命令
          terminal?.sendText(script);
          // 激活终端
          terminal?.show();
          // 对于watch命令不会自动终止，通过定时器来关闭
          if (minSecond) {
            setTimeout(() => {
              // 销毁终端
              // terminal?.dispose();
              // 保留当前终端，下一个串行任务新启一个终端
              mainTerminal = null;
              run(list, ++index);
            }, 1000 * minSecond);
          } else {
            run(list, ++index);
          }
        }
        if (list instanceof Array && list[0]) {
          run(list, 0);
        }
      },
      () => {
        vscode.window.showErrorMessage("当前目录下未找到hibox.json文件");
      }
    );
    function getTerminal(model: string, execDirectory: string) {
      // get一个终端
      let terminal: vscode.Terminal | null = null;
      // 串行
      if (model === "serial") {
        if (!mainTerminal) {
          mainTerminal = vscode.window.createTerminal({
            cwd: path.join(projectPath, execDirectory),
            name: "Hibox",
          });
        }
        return mainTerminal;
        // 并行
      } else if (model === "parallel") {
        terminal = vscode.window.createTerminal({
          cwd: path.join(projectPath, execDirectory),
          name: "Hibox",
        });
      }
      return terminal;
    }
  });
}

export function deactivate() {}
