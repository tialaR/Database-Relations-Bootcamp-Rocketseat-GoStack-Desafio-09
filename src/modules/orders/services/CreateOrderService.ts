import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found.');
    }

    const foundProductsIds = products.map(product => ({
      id: product.id,
    }));

    const productsForGetPrices = await this.productsRepository.findAllById(
      foundProductsIds,
    );

    if (!productsForGetPrices) {
      throw new AppError('Products not found.');
    }

    const orderProducts = products.map(requestProduct => {
      const productBD = productsForGetPrices.find(
        prodBD => prodBD.id === requestProduct.id,
      );

      if (!productBD) {
        throw new AppError('Invalid Product.');
      }

      return {
        product_id: requestProduct.id,
        price: productBD.price,
        quantity: requestProduct.quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    return order;
  }
}

export default CreateOrderService;
