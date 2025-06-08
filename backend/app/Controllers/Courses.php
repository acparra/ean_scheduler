<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\HTTP\ResponseInterface;
use App\Models\Course;
use CodeIgniter\API\ResponseTrait;

class Courses extends ResourceController
{
    use ResponseTrait;

    protected $modelName = 'App\Models\Course';
    protected $format    = 'json';

    /**.
     * URL: GET /courses/search?q=termino
     * @return ResponseInterface
     */
    public function search(): ResponseInterface
    {
        $searchTerm = $this->request->getGet('q');

        if (empty($searchTerm) || strlen($searchTerm) < 6) {
            return $this->failValidationError('Se requieren minimo 6 caracteres');
        }

        $model = new Course();
        
        $courses = $model->like('course_name', $searchTerm, 'both', true)
                           ->findAll();

        if (empty($courses)) {
            return $this->respond([]); 
        }

        return $this->respond($courses);
    }
}
