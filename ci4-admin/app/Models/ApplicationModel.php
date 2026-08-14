<?php

namespace App\Models;

use CodeIgniter\Model;

class ApplicationModel extends Model
{
    protected $table         = 'applications';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';

    protected $allowedFields = [
        'company', 'company_en', 'ceo', 'biz_no', 'founded', 'employees', 'address', 'website',
        'name', 'position', 'phone', 'email',
        'product_name', 'category', 'product_desc', 'product_spec', 'certifications', 'store_url',
        'export_exp', 'export_countries', 'vn_exp', 'trade_types', 'referral', 'questions',
        'status', 'memo', 'extra',
    ];
}
