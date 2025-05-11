import { Action, ActionPanel, environment, Grid, Icon, showHUD, closeMainWindow } from "@raycast/api";
import { readdirSync, statSync, writeFileSync } from "fs";
import { basename, join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";

const execPromise = promisify(exec);

export default function Command() {
  // Get all loading files from all directories
  const dirs = readdirSync(environment.assetsPath)
    .map((item) => join(environment.assetsPath, item))
    .filter((item) => statSync(item).isDirectory());

  // Collect all files from all directories
  const allFiles = dirs.flatMap((dir) => 
    readdirSync(dir)
      .map((item) => join(dir, item))
      .filter((item) => statSync(item).isFile())
  );

  return (
    <Grid columns={4}>
      <Grid.Section title="Select Loading">
        {allFiles.map((file) => (
          <FileItem key={file} file={file} />
        ))}
      </Grid.Section>
    </Grid>
  );
}

function FileItem(props: { file: string }) {
  return (
    <Grid.Item
      title={basename(props.file)}
      content={props.file}
      actions={
        <ActionPanel>
          <DisplayFullScreenAction file={props.file} />
        </ActionPanel>
      }
    />
  );
}

function DisplayFullScreenAction(props: { file: string }) {
  return (
    <Action
      title="Display Full Screen"
      icon={Icon.Eye}
      onAction={async () => {
        try {
          // Create a temporary HTML file that will display the GIF in true fullscreen
          const htmlFilePath = join(tmpdir(), "fullscreen-viewer.html");
          const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Fullscreen GIF</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      background-color: black;
      overflow: hidden;
    }
    img {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    /* Add a click handler to exit */
    .exit-notice {
      position: fixed;
      bottom: 10px;
      right: 10px;
      color: white;
      background-color: rgba(0, 0, 0, 0.5);
      padding: 5px 10px;
      border-radius: 5px;
      font-family: sans-serif;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <img src="file://${props.file}" alt="Fullscreen GIF">
  <div class="exit-notice">Press ESC to exit fullscreen</div>
  <script>
    // Auto-enter fullscreen
    document.addEventListener('DOMContentLoaded', function() {
      document.documentElement.requestFullscreen().catch(e => {
        console.error('Error attempting to enable fullscreen:', e);
      });
    });
    
    // Add ESC key listener to exit
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
          setTimeout(() => window.close(), 100);
        }
      }
    });
  </script>
</body>
</html>
          `;
          
          writeFileSync(htmlFilePath, htmlContent);
          
          // Open the HTML file in the default browser in fullscreen
          await execPromise(`open -a "Google Chrome" "${htmlFilePath}" --args --start-fullscreen`).catch(() => {
            // Fall back to Safari if Chrome isn't available
            return execPromise(`open -a "Safari" "${htmlFilePath}"`);
          });
          
          closeMainWindow();
          showHUD("Opened in full screen");
        } catch (error) {
          console.error("Error opening file:", error);
          showHUD("Error opening file");
        }
      }}
    />
  );
}

