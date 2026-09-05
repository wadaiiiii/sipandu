-- MariaDB dump 10.19  Distrib 10.4.28-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: sipandu
-- ------------------------------------------------------
-- Server version	10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `academic_terms`
--

DROP TABLE IF EXISTS `academic_terms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `academic_terms` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `academic_year` varchar(255) NOT NULL,
  `semester` varchar(255) NOT NULL,
  `starts_at` date DEFAULT NULL,
  `ends_at` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `academic_terms_academic_year_semester_unique` (`academic_year`,`semester`),
  KEY `academic_terms_is_active_index` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `academic_terms`
--

LOCK TABLES `academic_terms` WRITE;
/*!40000 ALTER TABLE `academic_terms` DISABLE KEYS */;
/*!40000 ALTER TABLE `academic_terms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_class_announcements`
--

DROP TABLE IF EXISTS `course_class_announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `course_class_announcements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_class_id` bigint(20) unsigned NOT NULL,
  `body` text NOT NULL,
  `is_pinned` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `course_class_announcements_created_by_foreign` (`created_by`),
  KEY `course_class_announcements_course_class_id_created_at_index` (`course_class_id`,`created_at`),
  KEY `course_class_announcements_is_pinned_index` (`is_pinned`),
  CONSTRAINT `course_class_announcements_course_class_id_foreign` FOREIGN KEY (`course_class_id`) REFERENCES `course_classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_class_announcements_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_class_announcements`
--

LOCK TABLES `course_class_announcements` WRITE;
/*!40000 ALTER TABLE `course_class_announcements` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_class_announcements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_class_assignments`
--

DROP TABLE IF EXISTS `course_class_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `course_class_assignments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_class_meeting_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `instructions` text DEFAULT NULL,
  `attachment_url` text DEFAULT NULL,
  `attachment_name` varchar(255) DEFAULT NULL,
  `sub_cpmk_code` varchar(255) DEFAULT NULL,
  `weight_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `max_score` decimal(8,2) NOT NULL DEFAULT 100.00,
  `due_at` datetime DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'draft',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `course_class_assignments_course_class_meeting_id_foreign` (`course_class_meeting_id`),
  KEY `course_class_assignments_created_by_foreign` (`created_by`),
  KEY `course_class_assignments_sub_cpmk_code_index` (`sub_cpmk_code`),
  KEY `course_class_assignments_due_at_index` (`due_at`),
  KEY `course_class_assignments_status_index` (`status`),
  CONSTRAINT `course_class_assignments_course_class_meeting_id_foreign` FOREIGN KEY (`course_class_meeting_id`) REFERENCES `course_class_meetings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_class_assignments_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_class_assignments`
--

LOCK TABLES `course_class_assignments` WRITE;
/*!40000 ALTER TABLE `course_class_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_class_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_class_attendances`
--

DROP TABLE IF EXISTS `course_class_attendances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `course_class_attendances` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_class_meeting_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'present',
  `note` varchar(500) DEFAULT NULL,
  `recorded_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `meeting_student_attendance_unique` (`course_class_meeting_id`,`user_id`),
  KEY `course_class_attendances_user_id_foreign` (`user_id`),
  KEY `course_class_attendances_recorded_by_foreign` (`recorded_by`),
  KEY `course_class_attendances_status_index` (`status`),
  CONSTRAINT `course_class_attendances_course_class_meeting_id_foreign` FOREIGN KEY (`course_class_meeting_id`) REFERENCES `course_class_meetings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_class_attendances_recorded_by_foreign` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `course_class_attendances_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_class_attendances`
--

LOCK TABLES `course_class_attendances` WRITE;
/*!40000 ALTER TABLE `course_class_attendances` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_class_attendances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_class_comments`
--

DROP TABLE IF EXISTS `course_class_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `course_class_comments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_class_id` bigint(20) unsigned NOT NULL,
  `course_class_meeting_id` bigint(20) unsigned DEFAULT NULL,
  `course_class_material_id` bigint(20) unsigned DEFAULT NULL,
  `course_class_assignment_id` bigint(20) unsigned DEFAULT NULL,
  `parent_id` bigint(20) unsigned DEFAULT NULL,
  `body` text NOT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `course_class_comments_course_class_meeting_id_foreign` (`course_class_meeting_id`),
  KEY `course_class_comments_course_class_material_id_foreign` (`course_class_material_id`),
  KEY `course_class_comments_course_class_assignment_id_foreign` (`course_class_assignment_id`),
  KEY `course_class_comments_parent_id_foreign` (`parent_id`),
  KEY `course_class_comments_created_by_foreign` (`created_by`),
  KEY `course_class_comments_course_class_id_created_at_index` (`course_class_id`,`created_at`),
  CONSTRAINT `course_class_comments_course_class_assignment_id_foreign` FOREIGN KEY (`course_class_assignment_id`) REFERENCES `course_class_assignments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `course_class_comments_course_class_id_foreign` FOREIGN KEY (`course_class_id`) REFERENCES `course_classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_class_comments_course_class_material_id_foreign` FOREIGN KEY (`course_class_material_id`) REFERENCES `course_class_materials` (`id`) ON DELETE SET NULL,
  CONSTRAINT `course_class_comments_course_class_meeting_id_foreign` FOREIGN KEY (`course_class_meeting_id`) REFERENCES `course_class_meetings` (`id`) ON DELETE SET NULL,
  CONSTRAINT `course_class_comments_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `course_class_comments_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `course_class_comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_class_comments`
--

LOCK TABLES `course_class_comments` WRITE;
/*!40000 ALTER TABLE `course_class_comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_class_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_class_material_progress`
--

DROP TABLE IF EXISTS `course_class_material_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `course_class_material_progress` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_class_material_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `learned_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `material_student_progress_unique` (`course_class_material_id`,`user_id`),
  KEY `course_class_material_progress_user_id_foreign` (`user_id`),
  KEY `course_class_material_progress_learned_at_index` (`learned_at`),
  CONSTRAINT `course_class_material_progress_course_class_material_id_foreign` FOREIGN KEY (`course_class_material_id`) REFERENCES `course_class_materials` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_class_material_progress_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_class_material_progress`
--

LOCK TABLES `course_class_material_progress` WRITE;
/*!40000 ALTER TABLE `course_class_material_progress` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_class_material_progress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_class_materials`
--

DROP TABLE IF EXISTS `course_class_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `course_class_materials` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_class_meeting_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `resource_type` varchar(255) NOT NULL DEFAULT 'link',
  `description` text DEFAULT NULL,
  `resource_url` text DEFAULT NULL,
  `attachment_url` text DEFAULT NULL,
  `attachment_name` varchar(255) DEFAULT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `course_class_materials_course_class_meeting_id_foreign` (`course_class_meeting_id`),
  KEY `course_class_materials_created_by_foreign` (`created_by`),
  KEY `course_class_materials_is_published_index` (`is_published`),
  CONSTRAINT `course_class_materials_course_class_meeting_id_foreign` FOREIGN KEY (`course_class_meeting_id`) REFERENCES `course_class_meetings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_class_materials_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_class_materials`
--

LOCK TABLES `course_class_materials` WRITE;
/*!40000 ALTER TABLE `course_class_materials` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_class_materials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_class_meetings`
--

DROP TABLE IF EXISTS `course_class_meetings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `course_class_meetings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_class_id` bigint(20) unsigned NOT NULL,
  `meeting_number` tinyint(3) unsigned NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `topic` text DEFAULT NULL,
  `sub_cpmk_code` varchar(255) DEFAULT NULL,
  `learning_method` varchar(255) DEFAULT NULL,
  `learning_activity` text DEFAULT NULL,
  `material_summary` text DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'planned',
  `starts_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `course_class_meetings_course_class_id_meeting_number_unique` (`course_class_id`,`meeting_number`),
  KEY `course_class_meetings_sub_cpmk_code_index` (`sub_cpmk_code`),
  KEY `course_class_meetings_status_index` (`status`),
  CONSTRAINT `course_class_meetings_course_class_id_foreign` FOREIGN KEY (`course_class_id`) REFERENCES `course_classes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_class_meetings`
--

LOCK TABLES `course_class_meetings` WRITE;
/*!40000 ALTER TABLE `course_class_meetings` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_class_meetings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_class_memberships`
--

DROP TABLE IF EXISTS `course_class_memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `course_class_memberships` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_class_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `membership_role` varchar(255) NOT NULL DEFAULT 'student',
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `course_class_memberships_course_class_id_user_id_unique` (`course_class_id`,`user_id`),
  KEY `course_class_memberships_user_id_foreign` (`user_id`),
  KEY `course_class_memberships_membership_role_index` (`membership_role`),
  KEY `course_class_memberships_status_index` (`status`),
  CONSTRAINT `course_class_memberships_course_class_id_foreign` FOREIGN KEY (`course_class_id`) REFERENCES `course_classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_class_memberships_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_class_memberships`
--

LOCK TABLES `course_class_memberships` WRITE;
/*!40000 ALTER TABLE `course_class_memberships` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_class_memberships` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_class_quizzes`
--

DROP TABLE IF EXISTS `course_class_quizzes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `course_class_quizzes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_class_id` bigint(20) unsigned NOT NULL,
  `title` varchar(180) NOT NULL,
  `description` text DEFAULT NULL,
  `sub_cpmk_code` varchar(80) DEFAULT NULL,
  `duration_minutes` smallint(5) unsigned DEFAULT NULL,
  `max_attempts` smallint(5) unsigned NOT NULL DEFAULT 1,
  `shuffle_questions` tinyint(1) NOT NULL DEFAULT 0,
  `shuffle_options` tinyint(1) NOT NULL DEFAULT 0,
  `starts_at` timestamp NULL DEFAULT NULL,
  `due_at` timestamp NULL DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `created_by` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `course_class_quizzes_created_by_foreign` (`created_by`),
  KEY `course_class_quizzes_course_class_id_status_due_at_index` (`course_class_id`,`status`,`due_at`),
  CONSTRAINT `course_class_quizzes_course_class_id_foreign` FOREIGN KEY (`course_class_id`) REFERENCES `course_classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_class_quizzes_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_class_quizzes`
--

LOCK TABLES `course_class_quizzes` WRITE;
/*!40000 ALTER TABLE `course_class_quizzes` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_class_quizzes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_class_submissions`
--

DROP TABLE IF EXISTS `course_class_submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `course_class_submissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_class_assignment_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `answer_text` text DEFAULT NULL,
  `attachment_url` text DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `score` decimal(8,2) DEFAULT NULL,
  `feedback` text DEFAULT NULL,
  `graded_by` bigint(20) unsigned DEFAULT NULL,
  `graded_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assignment_student_unique` (`course_class_assignment_id`,`user_id`),
  KEY `course_class_submissions_user_id_foreign` (`user_id`),
  KEY `course_class_submissions_graded_by_foreign` (`graded_by`),
  KEY `course_class_submissions_submitted_at_index` (`submitted_at`),
  CONSTRAINT `course_class_submissions_course_class_assignment_id_foreign` FOREIGN KEY (`course_class_assignment_id`) REFERENCES `course_class_assignments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_class_submissions_graded_by_foreign` FOREIGN KEY (`graded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `course_class_submissions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_class_submissions`
--

LOCK TABLES `course_class_submissions` WRITE;
/*!40000 ALTER TABLE `course_class_submissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_class_submissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_class_uploaded_files`
--

DROP TABLE IF EXISTS `course_class_uploaded_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `course_class_uploaded_files` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_class_id` bigint(20) unsigned NOT NULL,
  `uploaded_by` bigint(20) unsigned DEFAULT NULL,
  `purpose` varchar(40) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(160) DEFAULT NULL,
  `size_bytes` bigint(20) unsigned NOT NULL DEFAULT 0,
  `blob_url` text NOT NULL,
  `blob_pathname` varchar(950) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `course_class_uploaded_files_uploaded_by_foreign` (`uploaded_by`),
  KEY `course_class_uploaded_files_course_class_id_created_at_index` (`course_class_id`,`created_at`),
  KEY `course_class_uploaded_files_purpose_index` (`purpose`),
  CONSTRAINT `course_class_uploaded_files_course_class_id_foreign` FOREIGN KEY (`course_class_id`) REFERENCES `course_classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_class_uploaded_files_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_class_uploaded_files`
--

LOCK TABLES `course_class_uploaded_files` WRITE;
/*!40000 ALTER TABLE `course_class_uploaded_files` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_class_uploaded_files` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_classes`
--

DROP TABLE IF EXISTS `course_classes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `course_classes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_id` bigint(20) unsigned NOT NULL,
  `academic_term_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `join_code` varchar(30) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'draft',
  `rps_source_type` varchar(255) NOT NULL DEFAULT 'manual',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `course_classes_join_code_unique` (`join_code`),
  KEY `course_classes_course_id_foreign` (`course_id`),
  KEY `course_classes_academic_term_id_foreign` (`academic_term_id`),
  KEY `course_classes_created_by_foreign` (`created_by`),
  KEY `course_classes_status_index` (`status`),
  KEY `course_classes_rps_source_type_index` (`rps_source_type`),
  CONSTRAINT `course_classes_academic_term_id_foreign` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_classes_course_id_foreign` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_classes_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_classes`
--

LOCK TABLES `course_classes` WRITE;
/*!40000 ALTER TABLE `course_classes` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_classes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `courses`
--

DROP TABLE IF EXISTS `courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `courses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `credits` tinyint(3) unsigned NOT NULL DEFAULT 2,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `courses_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courses`
--

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
/*!40000 ALTER TABLE `courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'2026_08_28_000100_create_academic_core_tables',1),(3,'2026_08_28_000200_create_rps_snapshots_table',1),(4,'2026_08_28_010000_add_class_source_and_memberships',1),(5,'2026_08_28_020000_create_course_class_meetings_table',1),(6,'2026_08_28_030000_create_classroom_learning_cycle_tables',1),(7,'2026_08_28_040000_create_course_class_announcements_table',1),(8,'2026_08_28_050000_create_course_class_uploaded_files_table',1),(9,'2026_08_28_060000_create_course_class_material_progress_table',1),(10,'2026_08_28_070000_create_course_class_comments_table',1),(11,'2026_08_30_000100_add_material_attachment_fields',1),(12,'2026_08_30_120000_create_quiz_core_tables',1),(13,'2026_08_30_143000_add_custom_join_code_to_course_classes',1),(14,'2026_08_31_000000_repair_campus_lms_schema',1);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quiz_answers`
--

DROP TABLE IF EXISTS `quiz_answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `quiz_answers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `quiz_attempt_id` bigint(20) unsigned NOT NULL,
  `quiz_question_id` bigint(20) unsigned NOT NULL,
  `answer` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`answer`)),
  `score` decimal(10,2) DEFAULT NULL,
  `is_correct` tinyint(1) DEFAULT NULL,
  `feedback` text DEFAULT NULL,
  `graded_by` bigint(20) unsigned DEFAULT NULL,
  `graded_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quiz_answers_quiz_attempt_id_quiz_question_id_unique` (`quiz_attempt_id`,`quiz_question_id`),
  KEY `quiz_answers_quiz_question_id_foreign` (`quiz_question_id`),
  KEY `quiz_answers_graded_by_foreign` (`graded_by`),
  CONSTRAINT `quiz_answers_graded_by_foreign` FOREIGN KEY (`graded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `quiz_answers_quiz_attempt_id_foreign` FOREIGN KEY (`quiz_attempt_id`) REFERENCES `quiz_attempts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quiz_answers_quiz_question_id_foreign` FOREIGN KEY (`quiz_question_id`) REFERENCES `quiz_questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quiz_answers`
--

LOCK TABLES `quiz_answers` WRITE;
/*!40000 ALTER TABLE `quiz_answers` DISABLE KEYS */;
/*!40000 ALTER TABLE `quiz_answers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quiz_attempts`
--

DROP TABLE IF EXISTS `quiz_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `quiz_attempts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_class_quiz_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `attempt_number` smallint(5) unsigned NOT NULL DEFAULT 1,
  `status` varchar(20) NOT NULL DEFAULT 'in_progress',
  `started_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `submitted_at` timestamp NULL DEFAULT NULL,
  `auto_score` decimal(10,2) NOT NULL DEFAULT 0.00,
  `manual_score` decimal(10,2) NOT NULL DEFAULT 0.00,
  `score` decimal(10,2) DEFAULT NULL,
  `max_score` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quiz_attempt_unique` (`course_class_quiz_id`,`user_id`,`attempt_number`),
  KEY `quiz_attempts_user_id_status_index` (`user_id`,`status`),
  CONSTRAINT `quiz_attempts_course_class_quiz_id_foreign` FOREIGN KEY (`course_class_quiz_id`) REFERENCES `course_class_quizzes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quiz_attempts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quiz_attempts`
--

LOCK TABLES `quiz_attempts` WRITE;
/*!40000 ALTER TABLE `quiz_attempts` DISABLE KEYS */;
/*!40000 ALTER TABLE `quiz_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quiz_question_options`
--

DROP TABLE IF EXISTS `quiz_question_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `quiz_question_options` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `quiz_question_id` bigint(20) unsigned NOT NULL,
  `position` smallint(5) unsigned NOT NULL DEFAULT 1,
  `option_key` varchar(20) NOT NULL,
  `label` text NOT NULL,
  `is_correct` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quiz_question_options_quiz_question_id_option_key_unique` (`quiz_question_id`,`option_key`),
  CONSTRAINT `quiz_question_options_quiz_question_id_foreign` FOREIGN KEY (`quiz_question_id`) REFERENCES `quiz_questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quiz_question_options`
--

LOCK TABLES `quiz_question_options` WRITE;
/*!40000 ALTER TABLE `quiz_question_options` DISABLE KEYS */;
/*!40000 ALTER TABLE `quiz_question_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quiz_questions`
--

DROP TABLE IF EXISTS `quiz_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `quiz_questions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_class_quiz_id` bigint(20) unsigned NOT NULL,
  `position` smallint(5) unsigned NOT NULL DEFAULT 1,
  `type` varchar(32) NOT NULL,
  `prompt` text NOT NULL,
  `points` decimal(8,2) NOT NULL DEFAULT 1.00,
  `answer_key` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`answer_key`)),
  `explanation` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `quiz_questions_course_class_quiz_id_position_index` (`course_class_quiz_id`,`position`),
  CONSTRAINT `quiz_questions_course_class_quiz_id_foreign` FOREIGN KEY (`course_class_quiz_id`) REFERENCES `course_class_quizzes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quiz_questions`
--

LOCK TABLES `quiz_questions` WRITE;
/*!40000 ALTER TABLE `quiz_questions` DISABLE KEYS */;
/*!40000 ALTER TABLE `quiz_questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rps_snapshots`
--

DROP TABLE IF EXISTS `rps_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rps_snapshots` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_class_id` bigint(20) unsigned NOT NULL,
  `source_type` varchar(255) NOT NULL,
  `source_identifier` varchar(255) DEFAULT NULL,
  `source_version` varchar(255) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload`)),
  `is_current` tinyint(1) NOT NULL DEFAULT 1,
  `imported_by` bigint(20) unsigned DEFAULT NULL,
  `imported_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `rps_snapshots_course_class_id_foreign` (`course_class_id`),
  KEY `rps_snapshots_imported_by_foreign` (`imported_by`),
  KEY `rps_snapshots_source_type_index` (`source_type`),
  KEY `rps_snapshots_source_identifier_index` (`source_identifier`),
  KEY `rps_snapshots_is_current_index` (`is_current`),
  CONSTRAINT `rps_snapshots_course_class_id_foreign` FOREIGN KEY (`course_class_id`) REFERENCES `course_classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `rps_snapshots_imported_by_foreign` FOREIGN KEY (`imported_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rps_snapshots`
--

LOCK TABLES `rps_snapshots` WRITE;
/*!40000 ALTER TABLE `rps_snapshots` DISABLE KEYS */;
/*!40000 ALTER TABLE `rps_snapshots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `identity_number` varchar(255) DEFAULT NULL,
  `role` varchar(255) NOT NULL DEFAULT 'student',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_identity_number_index` (`identity_number`),
  KEY `users_role_index` (`role`),
  KEY `users_is_active_index` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-05 22:45:50
