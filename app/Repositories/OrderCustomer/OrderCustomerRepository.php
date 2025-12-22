<?php
namespace App\Repositories\OrderCustomer;

use App\Http\Traits\ResponseTrait;
use Illuminate\Support\Facades\Log;
use App\Models\Orders\OrderCustomer;
use App\Http\Resources\OrderCustomerResource;
use App\Repositories\OrderCustomer\OrderCustomerRepositoryInterface;


class OrderCustomerRepository implements OrderCustomerRepositoryInterface
{
    use ResponseTrait;
    protected $model;
    public function __construct(OrderCustomer $customer)
    {
        $this->model = $customer;
    }
    public function getById(int $id)
    {
        $customer = $this->model->find($id);
        return $customer;
    }
    public function getByShopifyId(int $id)
    {
        $customer = $this->model->where('shopify_customer_id', $id)->first();
        return $customer;
    }
    public function updateOrCreate(array $data)
    {
        // Separate unique identifier from update fields
        $uniqueKeys = [
            'shopify_customer_id' => $data['shopify_customer_id']
        ];

        // Fields to update
        $updateFields = [
            'first_name' => $data['first_name'] ?? null,
            'last_name' => $data['last_name'] ?? null,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
        ];

        $customer = $this->model->updateOrCreate($uniqueKeys, $updateFields);
        return $customer;
    }
    public function delete(int $id)
    {
        $customer = $this->getById($id);
        $customer->delete();
    }

}

