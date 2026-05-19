import express from "express";
import { trainingService } from "../services/trainingService.js";

const router = express.Router();

// COURSES
router.get("/courses", async (req, res) => {
  try {
    const { level } = req.query;
    const courses = await trainingService.getAllCourses(level);
    res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/courses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const course = await trainingService.getCourseById(id);
    const videos = await trainingService.getCourseVideos(id);
    res.json({
      success: true,
      data: {
        ...course,
        videos,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/courses/:id/videos", async (req, res) => {
  try {
    const { id } = req.params;
    const videos = await trainingService.getCourseVideos(id);
    res.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ENROLLMENTS
router.post("/enroll", async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({
        success: false,
        error: "Missing userId or courseId",
      });
    }

    const enrollment = await trainingService.enrollCourse(userId, courseId);
    res.json({
      success: true,
      data: enrollment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/my-courses/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const enrollments = await trainingService.getEnrollmentsByUser(userId);

    const enriched = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await trainingService.getCourseById(enrollment.courseId);
        return {
          ...enrollment,
          course: {
            id: course.id,
            title: course.title,
            icon: course.icon,
            level: course.level,
            thumbnail: course.thumbnail,
          },
        };
      })
    );

    res.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PROGRESS
router.post("/progress", async (req, res) => {
  try {
    const { userId, courseId, videoId, watchedDuration, totalDuration } =
      req.body;

    if (
      !userId ||
      !courseId ||
      !videoId ||
      watchedDuration === undefined ||
      totalDuration === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const result = await trainingService.updateProgress(
      userId,
      courseId,
      videoId,
      watchedDuration,
      totalDuration
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ACHIEVEMENTS
router.get("/achievements/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const achievements = await trainingService.getUserAchievements(userId);
    res.json({
      success: true,
      data: achievements,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// CERTIFICATES
router.get("/certificates/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const certificates = await trainingService.getCertificatesByUser(userId);
    res.json({
      success: true,
      data: certificates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/complete-course", async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({
        success: false,
        error: "Missing userId or courseId",
      });
    }

    const certificateId = await trainingService.issueCertificate(
      userId,
      courseId
    );
    res.json({
      success: true,
      data: { certificateId },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// SEED DATA (only for development)
router.post("/seed-data", async (req, res) => {
  try {
    const courses = await trainingService.seedCourses();
    const videos = await trainingService.seedVideos();
    const achievements = await trainingService.seedAchievements();

    res.json({
      success: true,
      message: "Data seeded successfully",
      data: {
        coursesCount: courses.length,
        videosCount: Object.values(videos).flat().length,
        achievementsCount: achievements.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
