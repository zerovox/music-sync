# music-sync

Previously, I used itunes with itunes match to sync music between my desktop, laptop, etc. Seemingly there was no way to pair this with an android phone, and I wanted more control over my setup (youtube music is a joke).
My new setup is a navidrome instance hosted on the cheapest linode instance, with a linode objects bucket mounted using rclone for music library storage, and subsonic android clients such as ultrasonic for offline/android auto usage.

In this repo, there are various utilities that helped me transition:
- `./sync.ts` uploads files from a local music dir to a given folder in a bucket. It stores md5 hashes of the sync'd files (and the etags reported on upload) to track which files are out of date. It does not sync deletes. I re-run this whenever I have new music to sync to my navidrome instance.
- `./metadata-to-navidrome.ts` grabs the ratings, play counts and last played info from my local itunes library xml file, finds the corresponding item_ids in a navidrome sqlite DB, and creates annotations. This let me transition my many years of play count and rating history to navidrome as a one time migration.

It uses aws-sdk for s3 writes, and expects a `.aws-credentials` file in the working dir:

```
[default]
aws_access_key_id="..."
aws_secret_access_key="..."
```
