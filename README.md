# Simple Digital Ocean Volume Auto Snapshot Job
Digital Ocean doesn't have feature which allows one to create automated snapshots of volumes. However, they have REST APIs. And that's all one needs. This project looks for a .env file in the root folder.
Here is an example file
```
# LOG_LEVEL
LOG_LEVEL=info
# Log directory, usually insider /var/log/ for *nix systems
LOG_DIR=/var/log/do-volume-backup-job/

# How many snapshots you want to retain?
SNAPSHOTS_TO_RETAIN=1
# Token
DO_TOKEN=your-top-secret-digital-ocean-get-yours-from-https://cloud.digitalocean.com/account/api/tokens

```
