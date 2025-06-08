<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\Course; 
use App\Models\CourseGroup; 
use App\Models\CourseGroupSchedule; 

class Scheduler extends ResourceController
{
    use ResponseTrait;

    protected $format    = 'json';

    /**.
     * URL: POST /scheduler/generate
     */
    public function generate()
    {
        $input = $this->request->getJSON(true);

        if (!isset($input['selected_courses']) || !is_array($input['selected_courses']) || !isset($input['user_availability']) || !is_array($input['user_availability'])) {
            return $this->respond(['reason' => 'Datos de entrada invalidos. Se esperan "selected_courses" (array de course_codes) y "user_availability" (array).'], 400);
        }

        $selectedCourseCodes = array_unique($input['selected_courses']);
        $userAvailability = $input['user_availability'];

        if (empty($selectedCourseCodes)) {
            return $this->respond(['reason' => 'Debe seleccionar al menos un codigo de curso.'], 400);
        }

        $courseModel = new Course();
        $courseGroupModel = new CourseGroup();
        $scheduleModel = new CourseGroupSchedule();

        $courseIds = [];
        $notFoundCodes = [];
        foreach ($selectedCourseCodes as $courseCode) {
            $course = $courseModel->where('course_code', $courseCode)->first();
            if ($course) {
                $courseIds[] = $course['id'];
            } else {
                $notFoundCodes[] = $courseCode;
            }
        }

        if (!empty($notFoundCodes)) {
            return $this->respond(['reason' => 'Los siguientes codigos de curso no fueron encontrados: ' . implode(', ', $notFoundCodes)], 404);
        }
        
        if (empty($courseIds)) {
             return $this->respond(['reason' => 'No se encontraron cursos validos para los codigos proporcionados.'], 404);
        }

        $distinctCourseIds = array_unique($courseIds);

        // Obtener todos los grupos relevantes para los course_ids seleccionados
        $relevantCourseGroups = $courseGroupModel->whereIn('course_id', $distinctCourseIds)->findAll();

        if (empty($relevantCourseGroups)) {
            return $this->respond(['reason' => 'No se encontraron grupos para los cursos seleccionados.'], 404);
        }

        // Obtener todos los horarios para estos grupos relevantes de una vez
        $groupIds = array_column($relevantCourseGroups, 'id');
        $schedulesData = $scheduleModel->whereIn('course_group_id', $groupIds)->findAll();
        
        $schedulesByGroupId = [];
        foreach ($schedulesData as $sch) {
            $schedulesByGroupId[$sch['course_group_id']][] = $sch;
        }

        // Adjuntar horarios a cada grupo y filtrar aquellos sin horarios
        $schedulableGroups = [];
        foreach ($relevantCourseGroups as $group) {
            if (isset($schedulesByGroupId[$group['id']]) && !empty($schedulesByGroupId[$group['id']])) {
                $group['schedules'] = $schedulesByGroupId[$group['id']];
                $schedulableGroups[] = $group;
            }
        }

        // Verificar si para cada materia seleccionada tenemos al menos un grupo con horario
        $schedulableCourseIds = array_unique(array_column($schedulableGroups, 'course_id'));
        $missingCourseIds = array_diff($distinctCourseIds, $schedulableCourseIds);

        if (!empty($missingCourseIds)) {
            $missingCourseCodesMsg = [];
            foreach($missingCourseIds as $mId) {
                $cinfo = $courseModel->find($mId); // $courseModel ya esta instanciado
                $missingCourseCodesMsg[] = $cinfo ? $cinfo['course_code'] : "ID ".$mId;
            }
            return $this->respond(['reason' => 'No se encontraron grupos con horarios definidos para los siguientes cursos: ' . implode(', ', $missingCourseCodesMsg)], 404); 
        }

        if (empty($schedulableGroups)) { 
            return $this->respond(['reason' => 'No se encontraron grupos con horarios validos para los cursos seleccionados.'], 404);
        }

        // Intentar encontrar un conjunto de horarios compatibles
        $result = $this->findCompatibleSchedules($schedulableGroups, $userAvailability, $distinctCourseIds);

        if ($result['compatible']) {
            return $this->respond($result['schedules']); // HTTP 200 OK by default, response is the array directly
        } else {
            return $this->respond(['reason' => $result['reason'] ?? 'No se pudo generar un horario compatible.'], 409); // 409 Conflict
        }
    }

    private function findCompatibleSchedules(array $allSchedulableGroups, array $userAvailability, array $distinctCourseIds)
    {
        // 1. Agrupar los grupos por su course_id original
        $groupsByCourseId = [];
        foreach ($allSchedulableGroups as $group) {
            $groupsByCourseId[$group['course_id']][] = $group;
        }
        
        $indexedCourseIds = array_values($distinctCourseIds);
        $allFoundSchedulesGroups = [];

        $this->buildScheduleRecursive(0, [], $indexedCourseIds, $groupsByCourseId, $userAvailability, $allFoundSchedulesGroups);

        if (empty($allFoundSchedulesGroups)) {
            return ['compatible' => false, 'reason' => 'No se encontraron horarios compatibles.', 'schedules' => []];
        }

        // Filtrar y procesar los resultados
        $validScheduleGroups = [];
        foreach ($allFoundSchedulesGroups as $groupSet) {
            $courseIdsInGroupSet = array_unique(array_column($groupSet, 'course_id'));
            // Considerar un horario valido si incluye al menos 2 materias distintas
            if (count($courseIdsInGroupSet) >= 2) { 
                $validScheduleGroups[] = $groupSet;
            }
        }

        if (empty($validScheduleGroups)) {
            // Si buildScheduleRecursive encontro algo, pero nada con al menos 2 materias
            return ['compatible' => false, 'reason' => 'No se encontraron horarios compatibles que incluyan al menos 2 materias.', 'schedules' => []];
        }
        
        // Ordenar todos los horarios validos por numero de cursos (descendente)
        // para priorizar aquellos que son mas completos.
        usort($validScheduleGroups, function ($a, $b) {
            $countA = count(array_unique(array_column($a, 'course_id')));
            $countB = count(array_unique(array_column($b, 'course_id')));
            return $countB <=> $countA; // Descendente
        });

        $formattedSchedules = [];
        foreach($validScheduleGroups as $solutionGroups) {
            $formattedSchedules[] = $this->formatScheduleOutput($solutionGroups);
        }
        
        // Si $formattedSchedules esta vacio aqui (aunque es poco probable si $validScheduleGroups no lo estaba),
        // se devolvera 'compatible': true, 'schedules': [] lo cual es aceptable.
        return ['compatible' => true, 'schedules' => $formattedSchedules];
    }

    private function buildScheduleRecursive(
        int $courseIndex,           // Indice del course_id actual a procesar en $indexedCourseIds
        array $currentChosenGroups, // Array de objetos de grupo ya seleccionados para la combinacion actual
        array $indexedCourseIds,    // Array de todos los course_ids que el usuario quiere programar
        array $groupsByCourseId,    // Todos los grupos disponibles, agrupados por course_id
        array $userAvailability,
        array &$allFoundSchedules   // Referencia al array que colecciona todas las soluciones validas (arrays de grupos)
    ) {
        // Caso Base: Hemos considerado todos los cursos que el usuario queria.
        if ($courseIndex >= count($indexedCourseIds)) {
            // Si la combinacion actual tiene al menos 2 cursos, es una solucion valida (parcial o completa).
            if (count(array_unique(array_column($currentChosenGroups, 'course_id'))) >= 2) {
                // Evitar duplicados exactos de conjuntos de grupos
                $groupCodesSignature = array_column($currentChosenGroups, 'group_code');
                sort($groupCodesSignature);
                $signature = implode('-', $groupCodesSignature);

                $isDuplicate = false;
                foreach ($allFoundSchedules as $existingScheduleGroups) {
                    $existingSignatureArray = array_column($existingScheduleGroups, 'group_code');
                    sort($existingSignatureArray);
                    if (implode('-', $existingSignatureArray) === $signature) {
                        $isDuplicate = true;
                        break;
                    }
                }
                if (!$isDuplicate) {
                    $allFoundSchedules[] = $currentChosenGroups;
                }
            }
            return;
        }

        $currentCourseIdToSchedule = $indexedCourseIds[$courseIndex];
        $possibleGroupsForThisCourse = $groupsByCourseId[$currentCourseIdToSchedule] ?? [];

        // Opcion 1: Intentar incluir la materia actual ($currentCourseIdToSchedule)
        foreach ($possibleGroupsForThisCourse as $groupToTry) {
            $schedulesToTry = $groupToTry['schedules'];

            // Verificacion 1: Este grupo encaja en la disponibilidad del usuario?
            if (!$this->allSlotsFitAvailability($schedulesToTry, $userAvailability)) {
                continue; 
            }

            // Verificacion 2: Este grupo tiene conflicto con los grupos ya elegidos para esta combinacion?
            $hasConflictWithChosen = false;
            foreach ($currentChosenGroups as $alreadyChosenGroup) {
                if ($this->hasTimeConflict($schedulesToTry, $alreadyChosenGroup['schedules'])) {
                    $hasConflictWithChosen = true;
                    break;
                }
            }
            if ($hasConflictWithChosen) {
                continue; 
            }

            // Si es compatible, añadir y recurrir para la siguiente materia
            $newlyChosenGroups = $currentChosenGroups;
            $newlyChosenGroups[] = $groupToTry;
            $this->buildScheduleRecursive(
                $courseIndex + 1,
                $newlyChosenGroups,
                $indexedCourseIds,
                $groupsByCourseId,
                $userAvailability,
                $allFoundSchedules
            );
        }

        // Opcion 2: Saltar la materia actual y recurrir para la siguiente
        // Esto permite encontrar combinaciones que no incluyen todas las materias solicitadas (subconjuntos)
        $this->buildScheduleRecursive(
            $courseIndex + 1,
            $currentChosenGroups, // No se añade el grupo de la materia actual
            $indexedCourseIds,
            $groupsByCourseId,
            $userAvailability,
            $allFoundSchedules
        );
    }

    // Funcion auxiliar para formatear la salida de un conjunto de grupos elegidos
    private function formatScheduleOutput(array $solutionGroups): array
    {
        $finalSchedule = [];
        // Para obtener el course_code original, necesitamos el CourseModel.
        $courseModel = new Course(); 

        foreach ($solutionGroups as $chosenGroup) {
            $courseInfo = $courseModel->find($chosenGroup['course_id']);
            $originalCourseCode = $courseInfo ? $courseInfo['course_code'] : 'N/A';

            foreach ($chosenGroup['schedules'] as $scheduleEntry) {
                $finalSchedule[] = [
                    'course_code'       => $originalCourseCode,
                    'course_group_code' => $chosenGroup['group_code'],
                    'group_name'        => $chosenGroup['group_name'],
                    'day_of_week'       => $scheduleEntry['day_of_week'],
                    'start_time'        => $scheduleEntry['start_time'],
                    'end_time'          => $scheduleEntry['end_time'],
                ];
            }
        }
        return $finalSchedule;
    }

    // Funcion auxiliar para detectar conflictos entre dos conjuntos de horarios
    private function hasTimeConflict(array $timeSlots1, array $timeSlots2): bool
    {
        if (empty($timeSlots1) || empty($timeSlots2)) return false;

        foreach ($timeSlots1 as $slot1) {
            foreach ($timeSlots2 as $slot2) {
                if ($slot1['day_of_week'] === $slot2['day_of_week']) {
                    $startA = strtotime($slot1['start_time']);
                    $endA = strtotime($slot1['end_time']);
                    $startB = strtotime($slot2['start_time']);
                    $endB = strtotime($slot2['end_time']);

                    if ($startA < $endB && $startB < $endA) { 
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Funcion auxiliar para verificar si todos los horarios de un curso encajan en la disponibilidad del usuario
    private function allSlotsFitAvailability(array $courseTimeSlots, array $userAvailability): bool
    {
        if (empty($courseTimeSlots)) return true;
        
        foreach ($courseTimeSlots as $courseSlot) {
            $courseStartTime = strtotime($courseSlot['start_time']);
            $courseEndTime = strtotime($courseSlot['end_time']);
            $courseDay = $courseSlot['day_of_week'];
            $slotFits = false;

            foreach ($userAvailability as $availSlot) {
                if (isset($availSlot['day_of_week']) && $availSlot['day_of_week'] === $courseDay) {
                    if (isset($availSlot['start_time']) && isset($availSlot['end_time'])){
                        $availStartTime = strtotime($availSlot['start_time']);
                        $availEndTime = strtotime($availSlot['end_time']);

                        if ($courseStartTime >= $availStartTime && $courseEndTime <= $availEndTime) {
                            $slotFits = true;
                            break;
                        }
                    }
                }
            }
            if (!$slotFits) {
                return false;
            }
        }
        return true;
    }
}
