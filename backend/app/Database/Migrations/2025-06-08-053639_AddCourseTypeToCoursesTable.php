<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddCourseTypeToCoursesTable extends Migration
{
    public function up()
    {
        $fields = [
            'course_type' => [
                'type'       => "ENUM('semestre', 'ciclo')",
                'null'       => true,
                'after'      => 'academic_period',
                'comment'    => 'Indicates if the course is semester-based or cycle-based',
            ],
        ];
        $this->forge->addColumn('courses', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('courses', 'course_type');
    }
}
