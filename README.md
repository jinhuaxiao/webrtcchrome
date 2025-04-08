# WebRTC Control

A Chrome extension that enables users to control WebRTC behavior to protect their privacy and prevent IP leaks.

## Features

- **WebRTC Protection**: Control WebRTC settings to prevent IP leaks
- **Multiple Protection Levels**: Choose between maximum, medium, minimal, or no protection
- **Timezone Spoofing**: Optionally spoof your timezone to match your IP location
- **User-Friendly Interface**: Simple toggle switches and dropdown menus for easy configuration
- **Test Protection**: Built-in feature to verify that your protection is working correctly

## Description

WebRTC Control gives you control over WebRTC (Web Real-Time Communication) in Chrome, allowing you to disable or customize how WebRTC functions to protect your IP address from being exposed. This extension is especially useful for users concerned about privacy, particularly when using VPNs.

## How It Works

The extension modifies Chrome's WebRTC behavior through privacy APIs and injects scripts to control WebRTC functionality. It offers several protection levels:

- **Maximum Protection (Default)**: Disables non-proxied UDP
- **Medium Protection**: Restricts WebRTC to default public interface only
- **Minimal Protection**: Allows WebRTC on public and private interfaces
- **Off**: No protection, standard WebRTC behavior

Additionally, the extension can spoof your timezone to match your apparent IP location, adding an extra layer of privacy.

## Installation

1. Download the extension from the Chrome Web Store or install it manually in developer mode
2. Click on the WebRTC Control icon in your browser toolbar to access configuration options
3. Select your desired protection level
4. Enable additional features as needed

## Usage

1. Click the WebRTC Control icon in your browser's toolbar
2. Toggle protection on/off using the main switch
3. Select your desired protection level from the dropdown menu
4. Enable timezone spoofing if desired
5. Use the "Test Protection" button to verify that your IP is protected

## Advanced Settings

Access advanced settings to configure:
- Media Devices protection
- Additional object protection
- Custom timezone selection

## Privacy

This extension doesn't collect any personal data. All settings are stored locally on your device.

## License

[License Information]

## Credits

- Developer: [Developer Information]
- Homepage: https://mybrowseraddon.com/webrtc-control.html

## Support

For support, feature requests, or bug reports, please visit the extension homepage or file an issue on GitHub.
