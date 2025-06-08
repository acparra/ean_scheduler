<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class RemoveFieldsFromSchedulerTables extends Migration
{
    public function up()
    {
        $this->db->query('SET FOREIGN_KEY_CHECKS=0;');

        $this->forge->dropColumn('course_groups', 'offer_type');
        $this->forge->dropColumn('course_groups', 'academic_period');

        $this->db->query('ALTER TABLE course_group_schedules DROP INDEX unique_schedule_entry');

        $this->forge->dropColumn('course_group_schedules', 'location');

        $this->forge->addKey(['course_group_id', 'day_of_week', 'start_time', 'end_time'], false, true, 'unique_schedule_entry_new');

        $this->db->query('SET FOREIGN_KEY_CHECKS=1;');
    }

    public function down()
    {
        $this->db->query('SET FOREIGN_KEY_CHECKS=0;');

        $fields_course_groups = [
            'offer_type' => [
                'type'       => 'VARCHAR',
                'constraint' => '50',
                'null'       => true,
            ],
            'academic_period' => [
                'type'       => 'VARCHAR',
                'constraint' => '50',
                'null'       => true,
            ],
        ];
        $this->forge->addColumn('course_groups', $fields_course_groups);

        $field_location = [
            'location' => [
                'type'       => 'VARCHAR',
                'constraint' => '255',
                'null'       => true,
            ],
        ];
        $this->forge->addColumn('course_group_schedules', $field_location);
        
        $this->db->query('ALTER TABLE course_group_schedules DROP INDEX unique_schedule_entry_new');

        $this->forge->addKey(['course_group_id', 'day_of_week', 'start_time', 'end_time', 'location'], false, true, 'unique_schedule_entry');

        $this->db->query('SET FOREIGN_KEY_CHECKS=1;');
    }
}