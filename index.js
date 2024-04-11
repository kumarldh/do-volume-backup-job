require('dotenv').config();
const cron = require('node-cron');

const axiosInstance = require('./axios-instance');
const logger = require('./winston-logger');

const createVolumeSnapshot = async (volume) => {
  try {
    const postData = {
      name: `${volume.name}-${new Date().toISOString()}`,
      tags: [],
    };
    const response = await axiosInstance.post(
      `https://api.digitalocean.com/v2/volumes/${volume.id}/snapshots`,
      postData
    );
    return response.data;
  } catch (o_O) {
    logger.error(
      `Unable to create snapshot for ${volume?.name}! Status:${o_O?.response?.status}. Message: ${o_O?.response?.data?.message} `
    );
  }
};

const getVolumeSnapshots = async (volume) => {
  try {
    const response = await axiosInstance.get(
      `https://api.digitalocean.com/v2/volumes/${volume.id}/snapshots`
    );
    return response.data;
  } catch (o_O) {
    logger.error(
      `Unable get list of snapshot for ${volume?.name}! Status:${o_O?.response?.status}. Message: ${o_O?.response?.data?.message} `
    );
  }
};

const getVolumes = async () => {
  try {
    const volumesResponse = await axiosInstance.get(
      'https://api.digitalocean.com/v2/volumes'
    );
    return volumesResponse.data.volumes;
  } catch (o_O) {
    logger.error(
      `Something went wrong! Status:${o_O?.response?.status}. Message: ${o_O?.response?.data?.message} `
    );
  }
};

const scheduleSnapshotsForVolume = async (volume) => {
  try {
    logger.info(`Creating snapshot for ${volume.name}`);
    const createdSnapshot = await createVolumeSnapshot(volume);
    logger.info(`Snapshot for ${volume.name} requested! ${JSON.stringify(createdSnapshot)}`,);
  } catch (o_O) {
    logger.error(
      `Something went wrong! Status:${o_O?.response?.status}. Message: ${o_O?.response?.data?.message} `
    );
  }
};

// Cron job every hour at 30 minutes is a commonly used cron schedule.
cron.schedule('30 * * * *', async () => {
  // Get all volumes
  const volumes = await getVolumes();
  // Create snapshots for these volumes
  volumes.forEach(async (volume) => {
    const volumeSnapshotsResponse = await getVolumeSnapshots(volume);
    const SNAPSHOTS_TO_RETAIN = process.env.SNAPSHOTS_TO_RETAIN;
    const volumeIDSnapshotsMap = {};
    const volumeIDSnapshotsToBeDeleted = [];
    volumeSnapshotsResponse.snapshots.forEach((snapshot) => {
      if (!volumeIDSnapshotsMap[snapshot.resource_id]) {
        volumeIDSnapshotsMap[snapshot.resource_id] = [];
      }
      volumeIDSnapshotsMap[snapshot.resource_id].push({
        id: snapshot.id,
        name: snapshot.name,
        created_at: snapshot.created_at,
      });
    });
    const volumeIDSnapshots = Object.keys(volumeIDSnapshotsMap);
    volumeIDSnapshots.forEach((volumeIDSnapshot) => {
      volumeIDSnapshotsMap[volumeIDSnapshot].sort(
        (snapshotA, snapshotB) =>
          new Date(snapshotB.created_at).getTime() -
          new Date(snapshotA.created_at).getTime()
      );
    });
    volumeIDSnapshots.forEach((volumeIDSnapshot) => {
      const currentSnapshotsList = volumeIDSnapshotsMap[volumeIDSnapshot];
      if (currentSnapshotsList.length > SNAPSHOTS_TO_RETAIN) {
        currentSnapshotsList.splice(0, SNAPSHOTS_TO_RETAIN);
        for (const element of currentSnapshotsList) {
          volumeIDSnapshotsToBeDeleted.push(element.id);
        }
      }
    });
    volumeIDSnapshotsToBeDeleted.forEach(async (snapshot) => {
      try {
        logger.info(`About to delete snapshot id : ${snapshot}`);
        const deleteSnapshotResponse = await axiosInstance.delete(
          `https://api.digitalocean.com/v2/volumes/snapshots/${snapshot}`
        );
        if (deleteSnapshotResponse.status === 204) {
          logger.info(`Deleted snapshot id: ${snapshot}`);
        }
      } catch (o_O) {
        console.log(o_O?.response?.status);
        logger.error(
          `Unable to delete snapshot id: ${snapshot}! Status:${o_O?.response?.status}. Message: ${o_O?.response?.data?.message} `
        );
      }
    });
  });
});

// Cron job every hour is a commonly used cron schedule.
cron.schedule('0 * * * *', async () => {
  try {
    // Get all volumes
    const volumes = await getVolumes();
    // Create snapshots for these volumes
    volumes.forEach(async (volume) => {
      await scheduleSnapshotsForVolume(volume);
    });
  } catch (o_O) {
    logger.error(
      `Something went wrong! Status:${o_O?.response?.status}. Message: ${o_O?.response?.data?.message} `
    );
  }
});
