# Bluetooth Troubleshooting on Zorin OS (and other Linux distros)

If you are experiencing issues connecting your phone to the NodeNav application, particularly if the device appears but fails to connect or pair, it is likely due to a conflict with the desktop environment's built-in Bluetooth manager.

## The Issue

NodeNav implements its own Bluetooth pairing agent to handle secure pairing (passkey confirmation) directly within the application. However, desktop environments like GNOME (which Zorin OS uses) have their own Bluetooth service running in the background (`gnome-bluetooth`, `blueman-applet`, etc.) that also tries to handle these pairing requests.

When your phone attempts to pair, both NodeNav and the OS try to respond. Often, the OS intercepts the request and waits for you to click a notification on the desktop (which might be hidden or ignored), causing the pairing process in NodeNav to time out or fail.

## Solution: Disable OS Bluetooth Plugins

To allow NodeNav to fully manage Bluetooth connections, you should disable the interfering OS plugins.

### 1. Disable GNOME Bluetooth Auto-start

On Zorin OS / Ubuntu / GNOME:

1.  Open **Terminal**.
2.  Edit the Bluetooth config:
    ```bash
    sudo nano /etc/bluetooth/main.conf
    ```
3.  Ensure the following settings are set (this ensures the Bluetooth daemon itself behaves correctly):
    ```ini
    [General]
    # Make the adapter discoverable by default if you want
    DiscoverableTimeout = 0
    PairableTimeout = 0
    ```
    (Press `Ctrl+O` to save, `Enter` to confirm, `Ctrl+X` to exit).

### 2. Stop the GNOME/Desktop Bluetooth Applet

You need to prevent the desktop environment from registering its own agent.

**Option A: Temporary (for testing)**
Kill the `blueman-applet` or `gnome-bluetooth` process.
```bash
killall blueman-applet
# or
killall gnome-bluetooth-panel
```

**Option B: Permanent (Recommended for dedicated head units)**
If you are running this on a dedicated device (like a Raspberry Pi or car computer), you should disable the desktop Bluetooth integration.

1.  **Disable the Bluetooth plugin in GNOME/Zorin:**
    Go to **Settings > Applications > Startup Applications** and uncheck any Bluetooth managers.

2.  **Unload the module (Advanced):**
    If the issue persists, you can try to unload the specific module that handles policy if you are using PulseAudio/PipeWire for audio, though NodeNav handles audio routing separately.

### 3. Clear Existing Pairings

If you have failed pairing attempts, it's best to start fresh.

1.  Open **Terminal**.
2.  Run `bluetoothctl`.
3.  List devices: `devices`.
4.  Remove your phone: `remove AA:BB:CC:DD:EE:FF` (replace with your phone's address).
5.  Exit: `exit`.

### 4. Verify Permissions

Ensure the user running NodeNav has permission to access Bluetooth.
```bash
sudo usermod -a -G bluetooth $USER
```
(You will need to log out and log back in for this to take effect).

## Debugging

If you still have issues, you can monitor the Bluetooth daemon logs to see exactly why pairing is failing.

1.  Open a new terminal window.
2.  Run:
    ```bash
    sudo journalctl -u bluetooth -f
    ```
3.  Attempt to pair from NodeNav.
4.  Watch for errors like "Agent already exists" or "Authentication Failed".

## Quick Fix for "Connection Failed"

If the device is paired but won't connect:
1.  On your **Phone**, go to Bluetooth settings and "Forget This Device" (NodeNav).
2.  On the **Computer**, use `bluetoothctl` to `remove <phone_address>`.
3.  Restart the NodeNav application.
4.  Try pairing again.
