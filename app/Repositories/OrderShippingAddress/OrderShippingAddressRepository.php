<?php
namespace App\Repositories\OrderShippingAddress;

use App\Http\Traits\ResponseTrait;
use Illuminate\Support\Facades\Log;
use App\Models\Orders\OrderShippingAddress;
use App\Http\Resources\OrderShippingAddressResource;
use App\Repositories\OrderShippingAddress\OrderShippingAddressRepositoryInterface;


class OrderShippingAddressRepository implements OrderShippingAddressRepositoryInterface
{
    use ResponseTrait;
    protected $model;

    public function __construct(OrderShippingAddress $orderShippingAddress)
    {
        $this->model = $orderShippingAddress;
    }
    public function getById(int $id)
    {
        $shippingAddress = $this->model->find($id);
        return $shippingAddress;
    }
    public function getByOrderId(int $id)
    {
        $shippingAddress = $this->model->where('order_id', $id)->first();
        return $shippingAddress;
    }
    public function updateOrCreate(array $data)
    {
        // Separate unique identifier from update fields
        $uniqueKeys = [
            'order_id' => $data['order_id'],
        ];

        // Fields to update
        $updateFields = [
            'first_name' => $data['first_name'] ?? null,
            'last_name' => $data['last_name'] ?? null,
            'address1' => $data['address1'] ?? null,
            'address2' => $data['address2'] ?? null,
            'city' => $data['city'] ?? null,
            'province' => $data['province'] ?? null,
            'province_code' => $data['province_code'] ?? null,
            'country' => $data['country'] ?? null,
            'country_code' => $data['country_code'] ?? null,
            'zip' => $data['zip'] ?? null,
            'phone' => $data['phone'] ?? null,
            'company' => $data['company'] ?? null,
        ];

        $shippingAddress = $this->model->updateOrCreate($uniqueKeys, $updateFields);
        return $shippingAddress;
    }
    public function delete(int $id)
    {
        $shippingAddress = $this->getById($id);
        $shippingAddress->delete();
    }
}

