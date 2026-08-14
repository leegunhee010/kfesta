<?php

namespace App\Models;

use CodeIgniter\Model;

class InquiryModel extends Model
{
    protected $table         = 'inquiries';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';

    protected $allowedFields = [
        'name', 'phone', 'email', 'company', 'position', 'category',
        'status', 'memo', 'extra',
    ];
}
