<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use Config\Database;

class ClassDataSeeder extends Seeder
{
    public function run()
    {
        $this->db = Database::connect();
        $csvFilePath = 'c:\\xampp\\htdocs\\scheduler\\backend\\app\\Database\\Seeds\\Classes.csv'; 

        echo "Attempting to read CSV file from: {$csvFilePath}\n";

        if (!file_exists($csvFilePath)) {
            echo "Error: CSV file not found at the specified path. Please check the path.\n";
            return;
        }

        $file = fopen($csvFilePath, 'r');
        if ($file === false) {
            echo "Error: Could not open CSV file. Check file permissions or if the file is valid.\n";
            return;
        }

        fgetcsv($file, 0, ','); 

        $coursesCache = []; 
        $groupCache = []; 

        $dayColumnMapping = [
            'LUNES' => 25,
            'MARTES' => 26,
            'MIERCOLES' => 27,
            'JUEVES' => 28,
            'VIERNES' => 29,
            'SABADO' => 30,
            'DOMINGO' => 31,
        ];

        $rowCount = 0;
        $processedRowCount = 0;
        $skippedRowCount = 0;
        $insertedCourses = 0;
        $insertedGroups = 0;
        $insertedSchedules = 0;

        echo "Starting CSV data processing...\n";

        while (($row = fgetcsv($file, 0, ',')) !== false) {
            $rowCount++;
            if (count($row) < 32) {
                echo "Skipping incomplete row #{$rowCount} (found " . count($row) . " columns, expected at least 32). Data: " . substr(implode(',', $row), 0, 100) . "...\n";
                $skippedRowCount++;
                continue;
            }

            $row = array_map('trim', $row);
            $row = array_map(function($value) {
                return (strtoupper($value) === 'NULL' || $value === '') ? null : $value;
            }, $row);

            $academicPeriod = $row[0];
            $faculty = $row[1];
            $courseCode = $row[2];
            $groupCode = $row[3];
            $credits = isset($row[4]) && $row[4] !== '' ? (int)$row[4] : null;
            $offerType = $row[5];
            $typology = $row[6];
            $groupName = $row[7];
            $startDateStr = $row[21];
            $endDateStr = $row[22];
            $startTimeStr = $row[23];
            $endTimeStr = $row[24];

            if (empty($courseCode)) {
                echo "Skipping row #{$rowCount} due to missing or empty 'CODIGO UNIDAD DE ESTUDIO'. Group: '{$groupCode}'.\n";
                $skippedRowCount++;
                continue;
            }
            if (empty($groupCode)) {
                echo "Skipping row #{$rowCount} due to missing or empty 'CODIGO DEL GRUPO'. Course: '{$courseCode}'.\n";
                $skippedRowCount++;
                continue;
            }

            $courseName = $groupName; 
            if ($courseCode && $groupName && strpos($groupName, $courseCode) !== false) {
                $parts = explode($courseCode, $groupName);
                $potentialName = trim($parts[0]);
                if (!empty($potentialName) && strlen($potentialName) > 3) { 
                     $courseName = $potentialName;
                }
            }
            if (empty($courseName)) { 
                $courseName = $groupName ?: 'Nombre de curso no especificado';
            }

            $startDate = $this->formatDate($startDateStr, $rowCount);
            $endDate = $this->formatDate($endDateStr, $rowCount);
            $startTime = $this->formatTime($startTimeStr, $rowCount);
            $endTime = $this->formatTime($endTimeStr, $rowCount);

            $courseId = null;
            if (isset($coursesCache[$courseCode])) {
                $courseId = $coursesCache[$courseCode];
            } else {
                $existingCourse = $this->db->table('courses')->where('course_code', $courseCode)->get()->getRow();
                if ($existingCourse) {
                    $courseId = $existingCourse->id;
                } else {
                    $courseData = [
                        'course_code' => $courseCode,
                        'course_name' => $courseName,
                        'credits' => $credits,
                        'faculty' => $faculty,
                        'typology' => $typology,
                        'academic_period' => $academicPeriod,
                    ];
                    $this->db->table('courses')->insert($courseData);
                    $courseId = $this->db->insertID();
                    $insertedCourses++;
                }
                $coursesCache[$courseCode] = $courseId;
            }

            $groupId = null;
            if (isset($groupCache[$groupCode])) {
                $groupId = $groupCache[$groupCode];
            } else {
                 $existingGroup = $this->db->table('course_groups')->where('group_code', $groupCode)->get()->getRow();
                 if ($existingGroup) {
                    $groupId = $existingGroup->id;
                 } else {
                    $groupData = [
                        'course_id' => $courseId,
                        'group_code' => $groupCode,
                        'group_name' => $groupName ?: 'Grupo no especificado',
                        'offer_type' => $offerType,
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'academic_period' => $academicPeriod,
                    ];
                    $this->db->table('course_groups')->insert($groupData);
                    $groupId = $this->db->insertID();
                    $insertedGroups++;
                 }
                 $groupCache[$groupCode] = $groupId;
            }

            foreach ($dayColumnMapping as $dayName => $columnIndex) {
                if (isset($row[$columnIndex]) && !empty($row[$columnIndex])) {
                    $location = $row[$columnIndex];
                    if ($startTime && $endTime) {
                        $existingSchedule = $this->db->table('course_group_schedules')
                                            ->where('course_group_id', $groupId)
                                            ->where('day_of_week', $dayName)
                                            ->where('start_time', $startTime)
                                            ->where('end_time', $endTime)
                                            ->get()->getRow();
                        
                        if (!$existingSchedule) {
                            $scheduleData = [
                                'course_group_id' => $groupId,
                                'day_of_week' => $dayName,
                                'start_time' => $startTime,
                                'end_time' => $endTime,
                                'location' => $location,
                            ];
                            $this->db->table('course_group_schedules')->insert($scheduleData);
                            $insertedSchedules++;
                        }
                    }
                }
            }
            $processedRowCount++;
        }

        fclose($file);
        echo "\n--- CSV Processing Summary ---\n";
        echo "Total CSV rows read (after header): {$rowCount}\n";
        echo "Rows successfully processed and attempted for DB insertion: {$processedRowCount}\n";
        echo "Rows skipped due to errors (incomplete, missing codes, etc.): {$skippedRowCount}\n";
        echo "New courses inserted: {$insertedCourses}\n";
        echo "New groups inserted: {$insertedGroups}\n";
        echo "New schedule slots inserted: {$insertedSchedules}\n";
        echo "Class data seeding completed.\n";
    }

    private function formatDate($dateStr, $rowNum = 0)
    {
        if (empty($dateStr)) return null;
        $formats = ['d.m.Y', 'd/m/Y', 'Y-m-d', 'm/d/Y', 'd-m-Y']; 
        foreach ($formats as $format) {
            $date = \DateTime::createFromFormat($format, $dateStr);
            if ($date && $date->format($format) === $dateStr) {
                return $date->format('Y-m-d');
            }
        }
        $timestamp = strtotime($dateStr);
        if ($timestamp !== false) {
            return date('Y-m-d', $timestamp);
        }
        echo "Row #{$rowNum}: Warning - Could not parse date '{$dateStr}'. Tried formats: " . implode(', ', $formats) . "\n";
        return null;
    }

    private function formatTime($timeStr, $rowNum = 0)
    {
        if (empty($timeStr)) return null;
        $formats = ['H:i:s', 'H:i', 'g:i A', 'g:iA'];
        foreach ($formats as $format) {
            $time = \DateTime::createFromFormat($format, $timeStr);
            if ($time && $time->format($format) === $timeStr) {
                return $time->format('H:i:s');
            }
        }
        $timestamp = strtotime($timeStr);
        if ($timestamp !== false) {
            return date('H:i:s', $timestamp);
        }
        echo "Row #{$rowNum}: Warning - Could not parse time '{$timeStr}'. Tried formats: " . implode(', ', $formats) . "\n";
        return null;
    }
}
