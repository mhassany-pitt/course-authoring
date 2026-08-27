const mongoose = require('../authoring-api/node_modules/mongoose');
const path = require('path');
const fs = require('fs');

async function patch() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/course-authoring';
  const prevPath = path.join(__dirname, '..', 'migrate-old_courses', 'prev-courseauthoring.json');

  if (!fs.existsSync(prevPath)) {
    console.error(`Cannot find ${prevPath}`);
    process.exit(1);
  }

  const prevData = JSON.parse(fs.readFileSync(prevPath, 'utf8')).data;
  const prevCourses = prevData.courses;
  console.log(`Loaded ${prevCourses.length} legacy courses.`);

  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB.');

    const db = mongoose.connection.db;
    const coursesColl = db.collection('courses');

    const totalCourses = await coursesColl.countDocuments({});
    console.log(`Total courses in MongoDB 'courses' collection: ${totalCourses}`);

    let updatedCount = 0;
    for (const p of prevCourses) {
      const cid = parseInt(p.id, 10);
      const code = p.num;
      const name = p.name;

      const res = await coursesColl.updateMany(
        { code: code, name: name },
        { $set: { cid: cid } }
      );

      if (res.matchedCount > 0) {
        updatedCount += res.matchedCount;
      } else {
        const resName = await coursesColl.updateMany(
          { name: name, cid: { $exists: false } },
          { $set: { cid: cid } }
        );
        if (resName.matchedCount > 0) {
          updatedCount += resName.matchedCount;
        }
      }
    }

    console.log(`Successfully patched ${updatedCount} course document(s) in MongoDB with their legacy cid.`);
  } catch (err) {
    console.log(`Note on MongoDB connection: ${err.message}`);
  } finally {
    await mongoose.disconnect();
  }
}

patch();

