type CarPageProps = {
  params: {
    id: string;
  }
}

const CarPage = async ({ params }: CarPageProps) => {
  const { id } = await params
  return (
    <div>
      CarPage: {id}
    </div>
  )
}

export default CarPage;